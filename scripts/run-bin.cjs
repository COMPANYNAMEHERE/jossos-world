#!/usr/bin/env node
/* Lightweight runner that executes a package's bin entry without relying on node_modules/.bin symlinks. */
const { spawn } = require('child_process');
const { join, dirname } = require('path');
const fs = require('fs');

if (process.argv.length < 3) {
  console.error('Usage: node scripts/run-bin.cjs <pkg> [args...]');
  process.exit(1);
}

const pkgName = process.argv[2];
const args = process.argv.slice(3);

function resolveBin(pkg) {
  const pkgJsonPath = require.resolve(`${pkg}/package.json`);
  const pkgDir = dirname(pkgJsonPath);
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const binField = pkgJson.bin;
  let relBin;
  if (typeof binField === 'string') {
    relBin = binField;
  } else if (typeof binField === 'object' && binField !== null) {
    const first = Object.values(binField)[0];
    if (!first) throw new Error(`No bin entries found in ${pkg}`);
    relBin = first;
  } else {
    throw new Error(`Package ${pkg} has no bin field`);
  }
  return join(pkgDir, relBin);
}

const bin = resolveBin(pkgName);
const child = spawn(process.execPath, [bin, ...args], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));

