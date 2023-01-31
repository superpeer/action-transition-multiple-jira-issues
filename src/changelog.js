const axios = require('axios');
const moment = require('moment');
const orderBy = require('lodash.orderby');
const { getInput } = require('./helpers');

class ChangelogBuilder {
  constructor(issues) {
    this.jiraChangelogEntryFieldId = getInput('jira-changelog-entry-field-id');
    this.issues = issues;

    this.api = axios.create({
      baseURL: 'https://api.headwayapp.co/v0/graphql',
      headers: {
        'Content-Type': 'application/json',
        'X-Headway-Access-Token': getInput('headway-api-access-token'),
      },
    });
  }

  groupEntries() {
    this.entries = this.issues.reduce((acc, issue) => {
      const text = this.getChangelogEntryFromIssue(issue);

      if (!text) {
        return acc;
      }

      const [_, type, __, index, entry] = text.match(/\[(\w+)\]\s*(\[(\d+)\])?(.*)/); // eslint-disable-line no-unused-vars
      const types = ['feature', 'improvement', 'change', 'fix'];

      if (type) {
        if (acc[type] && types.includes(type)) {
          acc[type].push({ index, text: entry.trim() });
        } else {
          console.log(`🚨 Unknown changelog entry type: ${type}`);
        }
      }

      return acc;
    }, {
      feature: [], improvement: [], change: [], fix: [],
    });

    return this;
  }

  orderEntries() {
    this.entries = {
      feature: orderBy(this.entries.feature, ['index'], ['asc']).map((i) => i.text),
      improvement: orderBy(this.entries.improvement, ['index'], ['asc']).map((i) => i.text),
      change: orderBy(this.entries.change, ['index'], ['asc']).map((i) => i.text),
      fix: orderBy(this.entries.fix, ['index'], ['asc']).map((i) => i.text),
    };

    return this;
  }

  toHumanReadable() {
    this.entries = `
      ${ChangelogBuilder.buildMarkdownSection('New Features', this.entries.feature)}
      ${ChangelogBuilder.buildMarkdownSection('Improvements', this.entries.improvement)}
      ${ChangelogBuilder.buildMarkdownSection('Changes', this.entries.change)}
      ${ChangelogBuilder.buildMarkdownSection('Fixes', this.entries.fix)}
    `.trim();

    return this;
  }

  getChangelogEntryFromIssue(issue) {
    return issue.fields[this.jiraChangelogEntryFieldId] || '';
  }

  async post() {
    if (!this.entries.length) {
      return;
    }

    const body = {
      query: `
        mutation ($changelog: CreateChangelogInput!) {
          createChangelog(input: $changelog) {
            id
            cursor
            title
            categories {
              id
              name
            }
            markdown
            html
            dateTime
            status
            url
          }
        }
      `,
      variables: {
        changelog: {
          title: moment.utc().format('MM-DD-YYYY'),
          dateTime: moment.utc().format(),
          markdown: this.entries,
          published: true,
          authorId: getInput('headway-api-author-id'),
          categories: getInput('headway-api-changelog-categories'),
        },
      },
    };

    const res = await this.api.post('/', body);

    console.log(`Published changelog entry is at ${res.data.data.createChangelog.url}`);
  }

  async publish() {
    await this
      .groupEntries()
      .orderEntries()
      .toHumanReadable()
      .post();
  }

  static buildMarkdownSection(title, entries) {
    if (!entries.length) {
      return '';
    }

    // Don't change the format of the following lines
    return `
## ${title}
- ${entries.join('\n- ')}
`;
  }
}

module.exports = ChangelogBuilder;
