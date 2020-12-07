const core = require('@actions/core')
const github = require('@actions/github')
const { IncomingWebhook } = require('@slack/webhook');

/**
 * @param {number} ms
 * @return {Promise}
 */
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @param {Object} octokit API
 * @param {String} owner
 * @param {String} repo
 * @param {number} pull_number
 * @return {Object} pull_request
 */
async function getPullRequest(octokit, owner, repo, pull_number) {
  for (let i = 0; i < 10; i++) {
    const { data: pr } = await octokit.pulls.get({owner, repo, pull_number});
    // Null while github checks the pull request
    if (pr.mergeable !== null) {
      return pr;
    }
    await timeout(1000);
  }
}

async function run() {
  try {
    const branch = core.getInput('branch');
    const token = core.getInput('token');
    const slackToken = core.getInput('slack_token');

    const { payload } = github.context;
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
    console.log(`Inputs: branch:${branch} owner:${owner} repo:${repo}`);

    const octokit = github.getOctokit(token);
    const { data: pulls } = await octokit.pulls.list({owner, repo});

    const openPulls = pulls.filter(pull =>
      pull.state === 'open' && !pull.draft && pull.base.ref === branch);
    console.log('Open pull_requests:', openPulls.length);

    const problemPulls = [];
    for (let pull of openPulls) {
      const pr = await getPullRequest(octokit, owner, repo, pull.number);
      if (pr && pr.rebaseable === false) { // can be null
        problemPulls.push(pr);
      }
    }

    console.log('Not rebaseable pull requests:', problemPulls.number);

    if (problemPulls.length == 0) {
      return;
    }


    let text = `Conflicts detected in following pull requests:`;
    for (let pull of problemPulls) {
      text += `
        <${pull.html_url}|#${pull.number}> ${pull.title} @${pull.user.login}`;
    }

    const slackUrl = `https://hooks.slack.com/services/${slackToken}`;
    const webhook = new IncomingWebhook(slackUrl);
    await webhook.send({text});

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
