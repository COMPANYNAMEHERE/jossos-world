#!/usr/bin/env node
// Publish dist/ to gh-pages with clearer diagnostics and no .bin symlinks
const { execSync } = require('child_process');
const path = require('path');
const ghpages = require('gh-pages');

function getOrigin() {
  try {
    return execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

const origin = getOrigin();
if (!origin) {
  console.error('Error: No git remote "origin" found. Set it to your GitHub repo and retry.');
  console.error('  Example: git remote add origin https://github.com/<username>/jossos-world.git');
  process.exit(1);
}

// No special-casing of usernames; any valid origin is accepted.

if (!/github\.com/.test(origin)) {
  console.warn('Warning: Remote origin is not a GitHub URL. gh-pages expects a GitHub repo.');
}

const dir = path.resolve('dist');
console.log(`Publishing ${dir} to gh-pages on ${origin} ...`);

ghpages.publish(
  dir,
  {
    branch: 'gh-pages',
    repo: origin,
    dotfiles: true,
    history: false,
    message: 'Deploy to gh-pages [skip ci]',
  },
  (err) => {
    if (err) {
      console.error('Failed to publish:', err);
      process.exit(1);
    } else {
      console.log('Published successfully. Check your repo settings → Pages.');
    }
  }
);
