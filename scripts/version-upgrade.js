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

function parseSemver(version) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bumpSemver(version, bumpType) {
  const parsed = parseSemver(version);
  if (!parsed) return null;

  const next = { ...parsed };
  if (bumpType === 'major') {
    next.major += 1;
    next.minor = 0;
    next.patch = 0;
  } else if (bumpType === 'minor') {
    next.minor += 1;
    next.patch = 0;
  } else if (bumpType === 'patch') {
    next.patch += 1;
  } else {
    return formatSemver(next);
  }

  return formatSemver(next);
}

function getMaxRepoVersion(packageJsonFiles, fallbackVersion) {
  let maxVersion = null;
  const fallbackParsed = parseSemver(fallbackVersion);
  if (fallbackParsed) maxVersion = formatSemver(fallbackParsed);

  for (const filePath of packageJsonFiles) {
    try {
      const packageJson = JSON.parse(readFileSync(filePath, 'utf8'));
      if (!packageJson.version) continue;
      const parsed = parseSemver(packageJson.version);
      if (!parsed) continue;

      const version = formatSemver(parsed);
      if (!maxVersion || compareVersions(version, maxVersion) > 0) {
        maxVersion = version;
      }
    } catch {
      continue;
    }
  }

  return maxVersion;
}

function updateAllPackageJsonFiles(version) {
  const packageJsonFiles = findAllPackageJsonFiles();
  const updatedFiles = [];
  let hasDowngradeIssue = false;

  console.log(`\nFound ${packageJsonFiles.length} package.json file(s)`);
  console.log(`Updating all workspaces to version: ${version}`);

  for (const filePath of packageJsonFiles) {
    try {
      const relativePath = relative(process.cwd(), filePath);
      const packageJson = JSON.parse(readFileSync(filePath, 'utf8'));

      if (!packageJson.version) {
        continue;
      }

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

function getCommitBumpType(commit) {
  const lowerCommit = commit.toLowerCase();
  const firstWord = lowerCommit.split(' ')[0];

  if (lowerCommit.startsWith('skip') || lowerCommit.includes('bump new version') || lowerCommit.includes('skip:')) {
    return 'none';
  }

  if (lowerCommit.includes('breaking change') || lowerCommit.includes('!:')) {
    return 'major';
  }

  if (
    lowerCommit.startsWith('feat:') ||
    lowerCommit.startsWith('feature:') ||
    ['add', 'create', 'implement', 'introduce', 'enable'].some(verb => firstWord === verb)
  ) {
    return 'minor';
  }

  if (
    lowerCommit.startsWith('fix:') ||
    lowerCommit.startsWith('perf:') ||
    lowerCommit.startsWith('refactor:') ||
    lowerCommit.startsWith('style:') ||
    lowerCommit.startsWith('test:') ||
    lowerCommit.startsWith('docs:') ||
    [
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
    ].some(verb => firstWord === verb)
  ) {
    return 'patch';
  }

  return 'none';
}

function getHighestBumpType(commits) {
  const rank = { none: 0, patch: 1, minor: 2, major: 3 };
  let highest = 'none';

  console.log('\nAnalyzing commits with potential version changes:');
  for (const commit of commits) {
    const bumpType = getCommitBumpType(commit);
    if (rank[bumpType] > rank[highest]) highest = bumpType;
    if (bumpType !== 'none') {
      console.log(`- ${commit} (${bumpType})`);
    }
  }

  return highest;
}

function updateVersion(baseVersion) {
  const commits = getNewCommits();

  if (commits.length === 0) {
    console.log('No new commits to analyze');
    return null;
  }

  console.log(`\nStarting version (max in repo): ${baseVersion}`);

  const bumpType = getHighestBumpType(commits);
  const bumped = bumpSemver(baseVersion, bumpType);
  if (!bumped) return null;

  console.log(`\nFinal version change: ${baseVersion} → ${bumped}`);
  if (bumped === baseVersion) {
    return null;
  }
  return bumped;
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

const packageJsonFiles = findAllPackageJsonFiles();
const baseVersion = getMaxRepoVersion(packageJsonFiles, rootPackageJson.version);

if (!baseVersion) {
  console.log('\nCould not determine a valid base version, skipping version update...');
  process.exit(0);
}

let newVersion = updateVersion(baseVersion);

if (!newVersion) {
  const autoPatchVersion = bumpSemver(baseVersion, 'patch');
  if (!autoPatchVersion) {
    console.log('\nCould not auto-bump patch version, skipping version update...');
    process.exit(0);
  }
  console.log(`\nNo version bump detected from commit messages, but files changed in affected workspaces.`);
  console.log(`Auto-bumping patch version: ${baseVersion} → ${autoPatchVersion}`);
  newVersion = autoPatchVersion;
}

const updatedFiles = updateAllPackageJsonFiles(newVersion);

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