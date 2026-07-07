#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

async function main() {
  const repoFull = process.env.GITHUB_REPOSITORY || 'SAFEME123/SAFEME123';
  const owner = repoFull.split('/')[0];
  const username = owner;
  const token = process.env.GITHUB_TOKEN || '';

  const octokit = new Octokit({ auth: token });

  console.log(`Fetching repositories for ${username}...`);
  const repos = await octokit.paginate(octokit.repos.listForUser, {
    username,
    per_page: 100,
  });

  const totalRepos = repos.length;
  const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const totalForks = repos.reduce((s, r) => s + (r.forks_count || 0), 0);

  // Count primary languages
  const langCounts = {};
  repos.forEach(r => {
    if (r.language) {
      langCounts[r.language] = (langCounts[r.language] || 0) + 1;
    }
  });
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang, count]) => `${lang} (${count})`)
    .join(' • ');

  const statsBlock = `<!-- STATS_START -->
<div align="center">

<p>

- Repositories: **${totalRepos}** • Stars: **${totalStars}** • Forks: **${totalForks}**

</p>

<img height="180em" src="https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&theme=algolia&include_all_commits=true&count_private=true" alt="GitHub Stats"/>
<img height="180em" src="https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=algolia&langs_count=8" alt="Top Languages"/>

<p>Top languages: ${topLanguages || 'N/A'}</p>

</div>
<!-- STATS_END -->`;

  const readmePath = path.join(process.cwd(), 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');

  if (/<!-- STATS_START -->[\\s\\S]*?<!-- STATS_END -->/m.test(readme)) {
    readme = readme.replace(/<!-- STATS_START -->[\\s\\S]*?<!-- STATS_END -->/m, statsBlock);
  } else {
    // Fallback: try to locate the "## 📊 GitHub Statistics" section and replace until the next "---"
    const sectionRegex = /(##\\s*📊\\s*GitHub Statistics[\\s\\S]*?)(?:\\n---|$)/m;
    if (sectionRegex.test(readme)) {
      readme = readme.replace(sectionRegex, `## 📊 GitHub Statistics\n\n${statsBlock}\n\n---`);
    } else {
      // If neither found, prepend the stats block to the top
      readme = `${statsBlock}\n\n${readme}`;
    }
  }

  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log('README.md updated with latest stats.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
