const dotenv = require('dotenv');
const github = require('@actions/github');
const core = require('@actions/core');

const loadEnv = () => {
  try {
    dotenv.config();
  } catch (e) {
    console.log('Failed to load local env file...', e);
  }
};

const getContextIssueKey = (key) => {
  loadEnv();

  const value = process.env[`github-context-issue-${key}`] || github.context.issue[key];

  if (value === undefined) {
    throw new Error(`Failed to get GitHub Context variable: issue.${key}`);
  }

  return value;
};

const getInput = (key) => {
  loadEnv();

  const input = core.getInput(key) || process.env[key];

  if (input === undefined) {
    throw new Error(`Missing input: ${key}`);
  }

  return input;
};

module.exports = {
  getInput,
  getContextIssueKey,
};
