const core = require('@actions/core');
const Jira = require('./jira');
const Github = require('./github');

class App {
  constructor() {
    this.targetStatus = core.getInput('target-status');
    this.isssuePrefixes = core.getInput('issue-prefixes');
    this.shouldDoTransitions = core.getInput('do-transitions') === 'true';
    this.shouldReleaseVersion = core.getInput('release-version') === 'true';

    if (!this.isssuePrefixes) {
      throw new Error('Missing issue prefixes input');
    }

    this.isssuePrefixes = this.isssuePrefixes.split(/,\s*/);
    this.ignoreStatuses = core.getInput('ignore-statuses');
    this.ignoreStatuses = this.ignoreStatuses ? this.ignoreStatuses.split(/,\s*/) : [];
    this.ignoreStatuses.push(this.targetStatus);

    this.jira = new Jira();
    this.github = new Github();
  }

  async run() {
    const commitMessages = await this.github.getPullRequestCommitMessages();
    const issueKeys = this.findIssueKeys(commitMessages);

    if (issueKeys.length === 0) {
      console.log('Commit messages do not contain any issue keys');

      return;
    }

    console.log(`Found issue keys: ${issueKeys.join(', ')}`);

    const issueList = await this.getIssueListFromKeys(issueKeys);
    const transitionIds = await this.getTransitionIds(issueList);
    const currentVersion = await this.jira.findTargetVersion();

    if (this.shouldDoTransitions) {
      console.log('Starting issue transitions');
      await this.transitionIssues(issueList, transitionIds);

      console.log('Adding comment to GitHub PR');
      await this.publishCommentWithIssues(issueList);
    } else {
      console.log('Starting to set Jira fix versions');
      await this.updateIssueFixVersions(issueList, currentVersion.id, currentVersion.name);
    }

    if (this.shouldReleaseVersion) {
      console.log('Relasing the current version');
      await this.jira.releaseVersion(currentVersion.id);
    }
  }

  async publishCommentWithIssues(issueList) {
    if (issueList.length > 0) {
      const issueComment = issueList
        .map((issue) => {
          const { summary } = issue.fields;
          const issueUrl = `${this.jira.getBaseUrl()}/browse/${issue.key})`;
          return `- ${summary} ([${issue.key}](${issueUrl})`;
        })
        .join('\n');

      const body = `These issues have been moved to *${this.targetStatus}*:\n${issueComment}`;

      await this.github.publishComment(body);
    }
  }

  async getIssueListFromKeys(issueKeys) {
    const issuesData = await Promise.all(issueKeys.map((issueKey) => this.jira.getIssue(issueKey)));

    return issuesData.filter((issue) => {
      const status = issue.fields.status.name;
      return !this.ignoreStatuses.includes(status);
    });
  }

  findIssueKeys(commitMessages) {
    const issueIdRegEx = /([a-zA-Z0-9]+-[0-9]+)/g;
    const matches = commitMessages.join(' ').match(issueIdRegEx);

    if (!matches) {
      return [];
    }

    const issueKeys = [...new Set(matches)];

    return issueKeys.filter((key) => {
      const prefix = key.substr(0, key.indexOf('-'));

      return this.isssuePrefixes.includes(prefix);
    });
  }

  async getTransitionIds(issues) {
    const transitionIds = await Promise.all(
      issues.map(async (issue) => {
        const { transitions } = await this.jira.getIssueTransitions(issue.key);
        const targetTransition = transitions.find(({ name }) => name === this.targetStatus);

        if (!targetTransition) {
          console.log(`Cannot find transition to status "${this.targetStatus}"`);

          return null;
        }

        return targetTransition.id;
      }),
    );

    return transitionIds.filter(Boolean);
  }

  async transitionIssues(issueList, transitionsIds) {
    for (let i = 0; i < issueList.length; i++) {
      const issueKey = issueList[i].key;
      const transitionId = transitionsIds[i];

      await this.jira.transitionIssue(issueKey, transitionId);
    }
  }

  async updateIssueFixVersions(issueList, versionId) {
    for (let i = 0; i < issueList.length; i++) {
      const issueKey = issueList[i].key;

      await this.jira.updateIssueFixVersion(issueKey, versionId);
    }
  }
}

module.exports = App;
