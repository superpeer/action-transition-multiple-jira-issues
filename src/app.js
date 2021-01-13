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
    console.log(`Commit messages: ${commitMessages}`);

    const issueKeys = this.findIssueKeys(commitMessages);
    if (!issueKeys) {
      console.log(`Commit messages doesn't contain any issue keys`);
      return;
    }

    console.log(`Found issue keys: ${issueKeys}`);
    const transitionIds = await this.getTransitionIds(issueKeys);
    await this.transitionIssues(issueKeys, transitionIds);
  }

  findIssueKeys(commitMessages) {
    const issueIdRegEx = /([a-zA-Z0-9]+-[0-9]+)/g;
    const matches = commitMessages.join(" ").match(issueIdRegEx);
    if (!matches) return [];
    return [...new Set(matches)];
  }

  async getTransitionIds(issues) {
    return issues.map(async (issue) => {
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
    });
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
