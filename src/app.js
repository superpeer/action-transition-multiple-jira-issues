const core = require("@actions/core");
const Jira = require("./jira");
const Github = require("./github");

class App {
  constructor() {
    this.targetStatus = core.getInput("target-status");

    if (!this.targetStatus) {
      throw new Error("Missing target status input");
    }

    this.jira = new Jira();
    this.github = new Github();
  }

  async run() {
    const commitMessages = await this.github.getPullRequestCommitMessages();
    const issueKeys = this.findIssueKeys(commitMessages);
    if (issueKeys.length === 0) {
      console.log(`Commit messages do not contain any issue keys`);
      return;
    }

    console.log(`Found issue keys: ${issueKeys.join(", ")}`);
    const transitionIds = await this.getTransitionIds(issueKeys);
    await this.publishCommentWithIssues(issueKeys);
    await this.transitionIssues(issueKeys, transitionIds);
  }

  async publishCommentWithIssues(issueKeys) {
    const issuesData = await Promise.all(issueKeys.map((issueKey) => this.jira.getIssue(issueKey)));

    const issueList = issuesData
      .filter((issue) => issue.fields.status.name !== this.targetStatus)
      .map((issue) => {
        const summary = issue.fields.summary;
        const issueUrl = `${this.jira.getBaseUrl()}/browse/${issue.key})`;
        return `- ${summary} ([${issue.key}](${issueUrl})`;
      });

    if (issueList.length > 0) {
      const body = `These issues have been moved to *${this.targetStatus}*:\n` + issueList.join("\n");
      await this.github.publishComment(body);
    }
  }

  findIssueKeys(commitMessages) {
    const issueIdRegEx = /([a-zA-Z0-9]+-[0-9]+)/g;
    const matches = commitMessages.join(" ").match(issueIdRegEx);
    if (!matches) return [];
    return [...new Set(matches)];
  }

  async getTransitionIds(issues) {
    return await Promise.all(
      issues.map(async (issue) => {
        const { transitions } = await this.jira.getIssueTransitions(issue);
        const targetTransition = transitions.find(
          ({ name }) => name === this.targetStatus
        );
        if (!targetTransition) {
          throw new Error(
            `Cannot find transition to status "${this.targetStatus}"`
          );
        }
        return targetTransition.id;
      })
    );
  }

  async transitionIssues(issues, transitionsIds) {
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const transitionId = transitionsIds[i];
      await this.jira.transitionIssue(issue, transitionId);
    }
  }
}

module.exports = App;
