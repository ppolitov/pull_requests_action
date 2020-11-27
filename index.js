const core = require('@actions/core')
const github = require('@actions/github')

async function run() {
  try {
    const token = core.getInput('token');
    const { payload } = github.context;
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
    //const [owner, repo] = payload.repository.full_name.split('/')
    console.log(`owner: ${owner} repo: ${repo}`);

    const octokit = github.getOctokit(token);
    const { data: pulls } = await octokit.pulls.list({owner, repo});
    console.log('Open pull_requests:', pulls.filter(p => p.state === 'open'));

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
    console.log('Not mergeable pr:', problemPulls);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
