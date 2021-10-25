const github = require('@actions/github');
const { getInput, getContextIssueKey } = require('./helpers');

class Github {
  constructor() {
    const token = getInput('github-token');
    const prNumber = getInput('pr-number');

    if (!token) {
      throw new Error('Missing GitHub token input');
    }

    this.octokit = github.getOctokit(token);
    this.prNumber = prNumber;
  }

  async getPullRequestCommitMessages() {
    const { data, status } = await this.octokit.pulls.listCommits({
      owner: getContextIssueKey('owner'),
      repo: getContextIssueKey('repo'),
      pull_number: this.prNumber,
    });

    if (status !== 200) {
      throw new Error('Something went wrong fetching commits from PR');
    }

    return data.map((x) => x.commit.message);
  }

  async publishComment(body) {
    await this.octokit.issues.createComment({
      owner: github.context.issue.owner,
      repo: github.context.issue.repo,
      issue_number: this.prNumber,
      body,
    });
  }
}

module.exports = Github;
