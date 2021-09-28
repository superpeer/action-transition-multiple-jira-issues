const axios = require('axios');
const core = require('@actions/core');

class Jira {
  constructor() {
    this.userEmail = core.getInput('jira-user-email');
    this.apiToken = core.getInput('jira-api-token');
    this.baseUrl = core.getInput('jira-base-url');
    this.projectKey = core.getInput('jira-project-key');

    if (!this.userEmail || !this.apiToken || !this.baseUrl || !this.projectKey) {
      throw new Error('Missing Jira input argument');
    }

    this.api = axios.create({
      baseURL: `${this.baseUrl}/rest/api/3`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.userEmail}:${this.apiToken}`).toString('base64')}`,
      },
    });
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async getIssue(issueId) {
    const path = `issue/${issueId}`;

    const { data } = await this.api.get(path);

    return data;
  }

  async getIssueTransitions(issueId) {
    const path = `issue/${issueId}/transitions`;

    const { data } = await this.api.get(path);

    return data;
  }

  async transitionIssue(issueId, transitionId) {
    const path = `issue/${issueId}/transitions`;
    const body = {
      transition: {
        id: transitionId,
      },
    };

    const { data } = await this.api.post(path, body);

    return data;
  }

  async findTargetVersion() {
    let version = await this.fetchLatestVersion();

    if (!version || Jira.isVersionReleased(version)) {
      const nextVersionName = Jira.proposeVersionNumber(version);

      version = await this.createNewVersion(nextVersionName);
    }

    return version;
  }

  async fetchLatestVersion() {
    console.log('fetching the latest version');
    const path = `project/${this.projectKey}/version?orderBy=-sequence`;

    const { data } = await this.api.get(path);

    return data.values[0];
  }

  async createNewVersion(nextVersionName) {
    console.log('creating a new version');

    const { data } = await this.api.post('version', {
      name: nextVersionName,
      startDate: Jira.getDate(),
      projectId: '10012', // TODO: This needs to be fixed
    });

    return data;
  }

  async releaseVersion(versionId) {
    console.log('releasing version');

    await this.api.put(`version/${versionId}`, {
      released: true,
      releaseDate: Jira.getDate(),
    });
  }

  async updateIssueFixVersion(issueId, versionId) {
    console.log('updating issue fix version');

    const { data } = await this.api.put(`issue/${issueId}`, {
      update: {
        fixVersions: [{ add: { name: versionId } }],
      },
    });

    return data;
  }

  static getDate() {
    return new Date().toISOString().slice(0, 10); // 2021-09-28
  }

  static isVersionReleased(version) {
    return version && version.released;
  }

  static proposeVersionNumber(version) {
    return this.isVersionReleased(version) ? parseInt(version.name, 10) + 1 : version.name;
  }
}

module.exports = Jira;
