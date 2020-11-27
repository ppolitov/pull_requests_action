const core = require('@actions/core')
const github = require('@actions/github')

async function run() {
  try {
    const token = core.getInput('token');
    const { payload } = github.context;
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
    //const [owner, repo] = payload.repository.full_name.split('/')

    const octokit = github.getOctokit(token);
    const { data: pulls } = await octokit.pulls.list({owner, repo});

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

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
