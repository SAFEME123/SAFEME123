#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

(async function main() {
  try {
    console.log('--- START generate-stats.js ---');
    console.log('cwd:', process.cwd());
    console.log('Node version:', process.version);
    console.log('ENV GITHUB_REPOSITORY:', process.env.GITHUB_REPOSITORY ? '<present>' : '<missing>');
    console.log('ENV GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? '<present>' : '<missing - ok (limited) >');

    const repoFull = process.env.GITHUB_REPOSITORY || 'SAFEME123/SAFEME123';
    const owner = repoFull.split('/')[0];
    const username = owner;
    const token = process.env.GITHUB_TOKEN || '';

    const octokit = new Octokit({ auth: token });

    // quick validation
    const readmePath = path.join(process.cwd(), 'README.md');
    if (!fs.existsSync(readmePath)) {
      throw new Error(`README.md not found at ${readmePath}`);
    }

    console.log(`Fetching repositories for user/org: ${username} ...`);
    // Wrapped paginate call for clearer error reporting
    let repos;
    try {
      repos = await octokit.paginate(octokit.repos.listForUser, {
        username,
        per_page: 100,
      });
    } catch (err) {
      console.error('Error fetching repos from GitHub API:');
      console.error('err.name:', err.name);
      console.error('err.status:', err.status);
      console.error('err.message:', err.message);
      if (err.headers) console.error('err.headers:', err.headers);
      if (err.documentation_url) console.error('err.documentation_url:', err.documentation_url);
      throw err;
    }

    console.log('Got repos count:', repos.length);

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

**Repositories:** ${totalRepos} | **Stars:** ${totalStars} | **Forks:** ${totalForks}

[![GitHub followers](https://img.shields.io/github/followers/${username}?label=Followers&style=social)](https://github.com/${username})
[![GitHub User's stars](https://img.shields.io/github/stars/${username}?affiliations=OWNER&label=Total%20Stars&style=social)](https://github.com/${username}?tab=stars)

**Top Languages:** ${topLanguages || 'N/A'}

</div>
<!-- STATS_END -->`;

    let readme = fs.readFileSync(readmePath, 'utf8');

    if (/<!-- STATS_START -->[\s\S]*?<!-- STATS_END -->/m.test(readme)) {
      readme = readme.replace(/<!-- STATS_START -->[\s\S]*?<!-- STATS_END -->/m, statsBlock);
      console.log('Replaced existing STATS block.');
    } else {
      // Fallback: try to locate the "## 📊 GitHub Statistics" section and replace until the next "---"
      const sectionRegex = /(##\s*📊\s*GitHub Statistics[\s\S]*?)(?:\n---|$)/m;
      if (sectionRegex.test(readme)) {
        readme = readme.replace(sectionRegex, `## 📊 GitHub Statistics\n\n${statsBlock}\n\n---`);
        console.log('Replaced section by header fallback.');
      } else {
        // If neither found, prepend the stats block to the top
        readme = `${statsBlock}\n\n${readme}`;
        console.log('Prepended stats block to README.');
      }
    }

    fs.writeFileSync(readmePath, readme, 'utf8');
    console.log('README.md updated with latest stats using Shields.io badges.');
    console.log('--- END generate-stats.js ---');
    process.exit(0);
  } catch (err) {
    console.error('Unhandled error in generate-stats.js:');
    console.error(err);
    // Exit with non-zero so Actions shows failure, but with full trace printed
    process.exit(1);
  }
})();
