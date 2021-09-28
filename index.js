// const core = require('@actions/core');
// const App = require('./src/app');

// try {
//   const app = new App();
//   app.run();
// } catch (error) {
//   core.setFailed(error.toString());
// }

const Jira = require('./src/jira');

(async () => {
  const jira = new Jira();

  const version = await jira.findTargetVersion();
  await jira.updateIssueFixVersion('PLY-1', version.name);
  await jira.releaseVersion(version.id);
})();
