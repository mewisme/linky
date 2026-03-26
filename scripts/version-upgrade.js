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

function updateAllPackageJsonFiles(version) {
  const packageJsonFiles = findAllPackageJsonFiles();
  const updatedFiles = [];
  let hasDowngradeIssue = false;

  console.log(`\nFound ${packageJsonFiles.length} package.json file(s)`);
  console.log(`Updating all packages to version: ${version}`);

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
    if (lastProcessedCommit) {
      try {
        const diffFiles = execSync(
          `git diff --name-only ${lastProcessedCommit}..HEAD`,
          { encoding: 'utf8' }
        )
          .split('\n')
          .filter(Boolean);

        if (diffFiles.length > 0) {
          console.log(
            `\nFound ${diffFiles.length} changed file(s) since last processed commit`
          );
          return diffFiles;
        }
      } catch (_) { }
    }

    try {
      const headFiles = execSync(
        'git diff-tree --no-commit-id --name-only -r HEAD',
        { encoding: 'utf8' }
      )
        .split('\n')
        .filter(Boolean);

      if (headFiles.length > 0) {
        console.log(
          `\nFound ${headFiles.length} changed file(s) in HEAD commit`
        );
        return headFiles;
      }
    } catch (_) { }

    try {
      const stagedFiles = execSync(
        'git diff --cached --name-only',
        { encoding: 'utf8' }
      )
        .split('\n')
        .filter(Boolean);

      if (stagedFiles.length > 0) {
        console.log(
          `\nFound ${stagedFiles.length} staged file(s)`
        );
        return stagedFiles;
      }
    } catch (_) { }

    console.log('\nNo changed files found');
    return [];
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

function getAffectedWorkspaces(changedFiles) {
  const affected = new Set();

  console.log('\nAnalyzing changed files to determine affected workspaces:');

  for (const file of changedFiles) {
    const parts = file.split('/');

    if (parts.length === 1) {
      console.log(`  - ${file} → root`);
      affected.add('root');
      continue;
    }

    const [scope, name] = parts;

    if (scope === 'apps' && name) {
      const workspace = `apps/${name}`;
      console.log(`  - ${file} → ${workspace}`);
      affected.add(workspace);
      continue;
    }

    if (scope === 'packages' && name) {
      const workspace = `packages/${name}`;
      console.log(`  - ${file} → ${workspace}`);
      affected.add(workspace);
      continue;
    }

    if (
      file === 'pnpm-lock.yaml' ||
      file === 'turbo.json'
    ) {
      console.log(`  - ${file} → root (global impact)`);
      affected.add('root');
      continue;
    }

    console.log(`  - ${file} → root`);
    affected.add('root');
  }

  return [...affected];
}

function analyzeCommits(commits) {
  const featureVerbs = new Set([
    'add',
    'create',
    'implement',
    'introduce',
    'enable'
  ]);

  const patchVerbs = new Set([
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
  ]);

  const priority = {
    none: 0,
    patch: 1,
    minor: 2,
    major: 3
  };

  let highestBumpType = 'none';

  console.log('\nAnalyzing commits with potential version changes:');

  for (const commit of commits) {
    const lower = commit.toLowerCase();

    const firstWord = lower.split(' ')[0];
    let bumpType = 'none';

    if (
      lower.includes('breaking change') ||
      lower.includes('!:')
    ) {
      bumpType = 'major';
    }

    else if (
      lower.startsWith('feat') ||
      lower.startsWith('feature') ||
      featureVerbs.has(firstWord)
    ) {
      bumpType = 'minor';
    }

    else if (
      lower.startsWith('chore') ||
      lower.startsWith('fix') ||
      lower.startsWith('perf') ||
      lower.startsWith('refactor') ||
      lower.startsWith('style') ||
      lower.startsWith('test') ||
      lower.startsWith('docs') ||
      patchVerbs.has(firstWord)
    ) {
      bumpType = 'patch';
    }

    if (priority[bumpType] > priority[highestBumpType]) {
      highestBumpType = bumpType;
    }

    console.log(`- ${commit} (${bumpType})`);
  }

  let tempMajor = major;
  let tempMinor = minor;
  let tempPatch = patch;

  switch (highestBumpType) {
    case 'major':
      tempMajor++;
      tempMinor = 0;
      tempPatch = 0;
      break;

    case 'minor':
      tempMinor++;
      tempPatch = 0;
      break;

    case 'patch':
      tempPatch++;
      break;
  }

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
  console.log(`\n✓ Final version: ${currentVersion} → ${newVersion}`);
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
  console.log('\nNo version bump detected from commit messages, skipping version update...');
  process.exit(0);
}

const updatedFiles = updateAllPackageJsonFiles(newVersion);

if (updatedFiles.length === 0) {
  console.log('\nNo package.json files to update');
  process.exit(0);
}

saveLastProcessedCommit();

execSync("git add .");

execSync(`git commit -m "chore: update package versions to ${newVersion} and refresh version lock

- Bumped package versions across multiple modules to ${newVersion} for consistency.
- Updated the version lock file to reflect the new hash.
- Maintained existing functionality while ensuring all packages are up to date."`, { encoding: 'utf8' })

console.log(`\n✓ Version upgraded to ${newVersion} in ${updatedFiles.length} package(s)`);
console.log('✓ Last processed commit saved to .version-lock'); 