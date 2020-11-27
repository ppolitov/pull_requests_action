const core = require('@actions/core')
const github = require('@actions/github')
const { IncomingWebhook } = require('@slack/webhook');

async function run() {
  try {
    const token = core.getInput('token');
    const slackToken = core.getInput('slack_token');

    const { payload } = github.context;
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
    console.log(`owner: ${owner} repo: ${repo}`);

    const octokit = github.getOctokit(token);
    const { data: pulls } = await octokit.pulls.list({owner, repo});
    console.log('Open pull_requests:',
      pulls.filter(p => p.state === 'open').length);

    const problemPulls = [];
    for (let pull of pulls) {
      if (pull.state === 'open' && !pull.draft) {
        const { data: pr } = await octokit.pulls.get(
          {owner, repo, pull_number: pull.number});
        if (!pr.rebaseable) {
          problemPulls.push(pr);
        }
      }
    }

    if (problemPulls.length == 0) {
      return;
    }


    let text = `Conflicts detected in following pull requests:`;
    for (let pull of problemPulls) {
      text += `
        <${pull.html_url}|#${pull.number}> ${pull.title`;
    }

    const slackUrl = `https://hooks.slack.com/services/${slackToken}`;
    const webhook = new IncomingWebhook(url);
    await webhook.send({text});

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
