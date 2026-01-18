#!/usr/bin/env node

import { dirname, join, relative } from 'path';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootPackageJsonPath = join(process.cwd(), 'package.json');
const versionLockPath = join(process.cwd(), '.version-lock');

const rootPackageJson = process.env.CURRENT_VERSION
  ? { version: process.env.CURRENT_VERSION }
  : JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'));
let [major, minor, patch] = rootPackageJson.version.split('.').map(Number);

function findAllPackageJsonFiles(rootDir = process.cwd(), packageJsonFiles = []) {
  try {
    const items = readdirSync(rootDir);

    for (const item of items) {
      if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build' || item === '.next') {
        continue;
      }

      const itemPath = join(rootDir, item);

      try {
        const stat = statSync(itemPath);

        if (stat.isDirectory()) {
          findAllPackageJsonFiles(itemPath, packageJsonFiles);
        } else if (item === 'package.json') {
          packageJsonFiles.push(itemPath);
        }
      } catch (error) {
        continue;
      }
    }
  } catch (error) {
  }

  return packageJsonFiles;
}

function compareVersions(version1, version2) {
  const [major1, minor1, patch1] = version1.split('.').map(Number);
  const [major2, minor2, patch2] = version2.split('.').map(Number);

  if (major1 !== major2) return major1 - major2;
  if (minor1 !== minor2) return minor1 - minor2;
  return patch1 - patch2;
}

function updateAffectedPackageJsonFiles(version, affectedWorkspaces) {
  const packageJsonFiles = findAllPackageJsonFiles();
  const updatedFiles = [];
  let hasDowngradeIssue = false;

  console.log(`\nFound ${packageJsonFiles.length} package.json file(s)`);
  console.log(`Affected workspaces: ${affectedWorkspaces.join(', ')}`);

  for (const filePath of packageJsonFiles) {
    try {
      const relativePath = relative(process.cwd(), filePath);
      const packageJson = JSON.parse(readFileSync(filePath, 'utf8'));

      if (!packageJson.version) {
        continue;
      }

      let shouldUpdate = false;

      const normalizedPath = relativePath.replace(/\\/g, '/');

      if (normalizedPath === 'package.json' && affectedWorkspaces.includes('root')) {
        shouldUpdate = true;
      }
      else {
        for (const workspace of affectedWorkspaces) {
          if (workspace === 'root') continue;

          const expectedPath = `${workspace}/package.json`;
          if (normalizedPath === expectedPath) {
            shouldUpdate = true;
            break;
          }
        }
      }

      if (shouldUpdate) {
        const oldVersion = packageJson.version;

        const comparison = compareVersions(version, oldVersion);

        if (comparison < 0) {
          console.log(`  ⚠ Skipped ${relativePath}: Cannot downgrade from ${oldVersion} to ${version}`);
          hasDowngradeIssue = true;
          continue;
        } else if (comparison === 0) {
          console.log(`  ⊘ Skipped ${relativePath}: Already at version ${version}`);
          continue;
        }

        packageJson.version = version;
        writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');

        console.log(`  ✓ Updated ${relativePath}: ${oldVersion} → ${version}`);
        updatedFiles.push(relativePath);
      } else {
        console.log(`  ⊘ Skipped ${relativePath} (not affected)`);
      }
    } catch (error) {
      const relativePath = relative(process.cwd(), filePath);
      console.error(`  ✗ Error updating ${relativePath}:`, error.message);
    }
  }

  if (hasDowngradeIssue) {
    console.log('\n⚠ WARNING: Some packages have versions higher than the calculated version.');
    console.log('  This usually happens when workspaces were previously bumped independently.');
    console.log('  Consider syncing all workspace versions or adjusting the root version.');
  }

  return updatedFiles;
}

function getLastProcessedCommit() {
  try {
    if (existsSync(versionLockPath)) {
      return readFileSync(versionLockPath, 'utf8').trim();
    }
  } catch (error) {
    console.log('No version lock file found, will process all commits');
  }
  return null;
}

function saveLastProcessedCommit() {
  const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  writeFileSync(versionLockPath, currentCommit);
}

function getNewCommits() {
  const lastProcessedCommit = getLastProcessedCommit();

  try {
    if (lastProcessedCommit) {
      return execSync(`git log ${lastProcessedCommit}..HEAD --not ${lastProcessedCommit} --pretty=format:"%s"`, { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    } else {
      return execSync('git log --pretty=format:"%s"', { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    }
  } catch (error) {
    console.error('Error getting git commits:', error.message);
    return [];
  }
}

function getChangedFiles() {
  const lastProcessedCommit = getLastProcessedCommit();

  try {
    try {
      const headFiles = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);

      if (headFiles.length > 0) {
        console.log(`\nFound ${headFiles.length} changed file(s) in HEAD commit`);
        return headFiles;
      }
    } catch (headError) {
    }

    try {
      const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);

      if (stagedFiles.length > 0) {
        console.log(`\nFound ${stagedFiles.length} staged file(s)`);
        return stagedFiles;
      }
    } catch (stagedError) {
    }

    if (lastProcessedCommit) {
      try {
        const diffFiles = execSync(`git diff --name-only ${lastProcessedCommit}..HEAD`, { encoding: 'utf8' })
          .split('\n')
          .filter(Boolean);

        if (diffFiles.length > 0) {
          console.log(`\nFound ${diffFiles.length} changed file(s) since last processed commit (fallback)`);
          return diffFiles;
        }
      } catch (diffError) {
      }
    }

    console.log('\nNo changed files found');
    return [];
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

function getAffectedWorkspaces(changedFiles) {
  const affectedWorkspaces = new Set();
  const workspacePatterns = [
    { pattern: /^apps\/([^\/]+)/, type: 'apps' },
    { pattern: /^packages\/([^\/]+)/, type: 'packages' }
  ];

  console.log('\nAnalyzing changed files to determine affected workspaces:');

  for (const file of changedFiles) {
    if (file === 'package.json' || file.endsWith('/package.json')) {
      console.log(`  - ${file} (skipped - package.json file)`);
      continue;
    }

    const isRootFile = !file.includes('/') ||
      (!file.startsWith('apps/') && !file.startsWith('packages/'));

    if (isRootFile) {
      console.log(`  - ${file} → root`);
      affectedWorkspaces.add('root');
      continue;
    }

    let matched = false;
    for (const { pattern, type } of workspacePatterns) {
      const match = file.match(pattern);
      if (match) {
        const workspaceName = `${type}/${match[1]}`;
        console.log(`  - ${file} → ${workspaceName}`);
        affectedWorkspaces.add(workspaceName);
        matched = true;
        break;
      }
    }

    if (!matched) {
      console.log(`  - ${file} → (no workspace match)`);
    }
  }

  return Array.from(affectedWorkspaces);
}

function analyzeCommits(commits) {
  let highestBumpType = 'none';

  const featureVerbs = [
    'add',
    'create',
    'implement',
    'introduce',
    'enable'
  ];

  const patchVerbs = [
    'update',
    'fix',
    'refactor',
    'format',
    'remove',
    'change',
    'merge',
    'clean',
    'optimize',
    'adjust',
    'modify',
    'rename',
    'move',
    'delete',
    'disable'
  ];

  let tempMajor = major;
  let tempMinor = minor;
  let tempPatch = patch;

  console.log('\nAnalyzing commits with potential version changes:');
  commits.forEach(commit => {
    const lowerCommit = commit.toLowerCase();
    const firstWord = lowerCommit.split(' ')[0];
    let commitBumpType = 'none';

    if (lowerCommit.startsWith('skip') || lowerCommit.includes('bump new version') || lowerCommit.includes('skip:')) {
      return;
    }

    if (lowerCommit.includes('breaking change') || lowerCommit.includes('!:')) {
      commitBumpType = 'major';
      if (highestBumpType !== 'major') {
        tempMajor++;
        tempMinor = 0;
        tempPatch = 0;
      }
      highestBumpType = 'major';
    }
    else if (
      lowerCommit.startsWith('feat:') ||
      lowerCommit.startsWith('feature:') ||
      featureVerbs.some(verb => firstWord === verb)
    ) {
      commitBumpType = 'minor';
      if (highestBumpType !== 'major') {
        if (highestBumpType !== 'minor') {
          tempMinor++;
          tempPatch = 0;
        }
        highestBumpType = 'minor';
      }
    }
    else if (
      lowerCommit.startsWith('fix:') ||
      lowerCommit.startsWith('perf:') ||
      lowerCommit.startsWith('refactor:') ||
      lowerCommit.startsWith('style:') ||
      lowerCommit.startsWith('test:') ||
      lowerCommit.startsWith('docs:') ||
      patchVerbs.some(verb => firstWord === verb)
    ) {
      commitBumpType = 'patch';
      tempPatch++;
      highestBumpType = 'patch';
    }
    else {
      commitBumpType = 'none';
    }
    console.log(`- ${commit} (${commitBumpType}: v${tempMajor}.${tempMinor}.${tempPatch})`);
  });

  return {
    major: tempMajor,
    minor: tempMinor,
    patch: tempPatch,
    shouldBumpMajor: highestBumpType === 'major',
    shouldBumpMinor: highestBumpType === 'minor',
    shouldBumpPatch: highestBumpType === 'patch'
  };
}

function updateVersion() {
  const commits = getNewCommits();

  if (commits.length === 0) {
    console.log('No new commits to analyze');
    return null;
  }

  const currentVersion = `${major}.${minor}.${patch}`;
  console.log(`\nStarting version: ${currentVersion}`);

  const { major: newMajor, minor: newMinor, patch: newPatch } = analyzeCommits(commits);

  const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
  console.log(`\nFinal version change: ${currentVersion} → ${newVersion}`);
  if (newVersion === currentVersion) {
    return null;
  }
  return newVersion;
}

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  console.log('\nNo changed files detected, skipping version update...');
  process.exit(0);
}

const affectedWorkspaces = getAffectedWorkspaces(changedFiles);

if (affectedWorkspaces.length === 0) {
  console.log('\nNo affected workspaces found, skipping version update...');
  process.exit(0);
}

let newVersion = updateVersion();

if (!newVersion) {
  const currentVersion = `${major}.${minor}.${patch}`;
  const autoPatchVersion = `${major}.${minor}.${patch + 1}`;
  console.log(`\nNo version bump detected from commit messages, but files changed in affected workspaces.`);
  console.log(`Auto-bumping patch version: ${currentVersion} → ${autoPatchVersion}`);
  newVersion = autoPatchVersion;
}

const updatedFiles = updateAffectedPackageJsonFiles(newVersion, affectedWorkspaces);

if (updatedFiles.length === 0) {
  console.log('\nNo package.json files to update');
  process.exit(0);
}

saveLastProcessedCommit();

try {
  execSync('git add .', { encoding: 'utf8', stdio: 'inherit' });
  console.log('\n✓ Staged all changes with `git add .`');
} catch (error) {
  console.error('\n✗ Error staging changes:', error.message);
}

console.log(`\n✓ Version upgraded to ${newVersion} in ${updatedFiles.length} package(s)`);
console.log('✓ Last processed commit saved to .version-lock'); 