#!/usr/bin/env node

import { dirname, join, relative } from 'path';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the root package.json path
const rootPackageJsonPath = join(process.cwd(), 'package.json');
const versionLockPath = join(process.cwd(), '.version-lock');

// Read current version from root package.json
const rootPackageJson = process.env.CURRENT_VERSION
  ? { version: process.env.CURRENT_VERSION }
  : JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'));
let [major, minor, patch] = rootPackageJson.version.split('.').map(Number);

// Function to find all package.json files in monorepo
function findAllPackageJsonFiles(rootDir = process.cwd(), packageJsonFiles = []) {
  try {
    const items = readdirSync(rootDir);

    for (const item of items) {
      // Skip node_modules, .git, and other common directories
      if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build' || item === '.next') {
        continue;
      }

      const itemPath = join(rootDir, item);

      try {
        const stat = statSync(itemPath);

        if (stat.isDirectory()) {
          // Recursively search in subdirectories
          findAllPackageJsonFiles(itemPath, packageJsonFiles);
        } else if (item === 'package.json') {
          packageJsonFiles.push(itemPath);
        }
      } catch (error) {
        // Skip files/directories that can't be accessed
        continue;
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }

  return packageJsonFiles;
}

// Function to update package.json files for affected workspaces only
function updateAffectedPackageJsonFiles(version, affectedWorkspaces) {
  const packageJsonFiles = findAllPackageJsonFiles();
  const updatedFiles = [];

  console.log(`\nFound ${packageJsonFiles.length} package.json file(s)`);
  console.log(`Affected workspaces: ${affectedWorkspaces.join(', ')}`);

  for (const filePath of packageJsonFiles) {
    try {
      const relativePath = relative(process.cwd(), filePath);
      const packageJson = JSON.parse(readFileSync(filePath, 'utf8'));

      // Only update if the file has a version field
      if (!packageJson.version) {
        continue;
      }

      // Check if this package.json belongs to an affected workspace
      let shouldUpdate = false;

      // Root package.json - always update if root is affected
      if (relativePath === 'package.json' && affectedWorkspaces.includes('root')) {
        shouldUpdate = true;
      }
      // Workspace package.json - check if workspace is affected
      else {
        for (const workspace of affectedWorkspaces) {
          if (workspace === 'root') continue;

          // Check if file path matches workspace pattern
          // e.g., apps/api/package.json matches workspace "apps/api"
          // Also handle nested paths like apps/api/src/package.json (should not match)
          // We only want to match the direct package.json in the workspace root
          if (relativePath === `${workspace}/package.json`) {
            shouldUpdate = true;
            break;
          }
        }
      }

      if (shouldUpdate) {
        const oldVersion = packageJson.version;
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

  return updatedFiles;
}

// Get the last processed commit hash
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

// Save the current HEAD as the last processed commit
function saveLastProcessedCommit() {
  const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  writeFileSync(versionLockPath, currentCommit);
}

// Get commits since last processed commit
function getNewCommits() {
  const lastProcessedCommit = getLastProcessedCommit();

  try {
    if (lastProcessedCommit) {
      // Get commits since last processed commit, excluding the last processed commit itself
      return execSync(`git log ${lastProcessedCommit}..HEAD --not ${lastProcessedCommit} --pretty=format:"%s"`, { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    } else {
      // If no last processed commit, get all commits
      return execSync('git log --pretty=format:"%s"', { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    }
  } catch (error) {
    console.error('Error getting git commits:', error.message);
    return [];
  }
}

// Get changed files from the most recent commit(s) since last processed
function getChangedFiles() {
  const lastProcessedCommit = getLastProcessedCommit();

  try {
    // Priority 1: Get files from HEAD commit (most recent commit)
    // This is the commit that was just made
    try {
      const headFiles = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);

      if (headFiles.length > 0) {
        console.log(`\nFound ${headFiles.length} changed file(s) in HEAD commit`);
        return headFiles;
      }
    } catch (headError) {
      // HEAD might not exist, continue to other methods
    }

    // Priority 2: If HEAD has no files, try to get staged files (for pre-commit hooks)
    try {
      const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);

      if (stagedFiles.length > 0) {
        console.log(`\nFound ${stagedFiles.length} staged file(s)`);
        return stagedFiles;
      }
    } catch (stagedError) {
      // No staged files, continue
    }

    // Priority 3: Fallback - get files from all commits since last processed
    // Only use this if HEAD commit has no files (shouldn't happen normally)
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
        // Continue
      }
    }

    console.log('\nNo changed files found');
    return [];
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

// Determine which workspaces have changed files
function getAffectedWorkspaces(changedFiles) {
  const affectedWorkspaces = new Set();
  const workspacePatterns = [
    { pattern: /^apps\/([^\/]+)/, type: 'apps' },
    { pattern: /^packages\/([^\/]+)/, type: 'packages' }
  ];

  console.log('\nAnalyzing changed files to determine affected workspaces:');

  for (const file of changedFiles) {
    // Skip package.json files themselves to avoid circular detection
    if (file === 'package.json' || file.endsWith('/package.json')) {
      console.log(`  - ${file} (skipped - package.json file)`);
      continue;
    }

    // Check if file is in root (not in any workspace)
    const isRootFile = !file.includes('/') ||
      (!file.startsWith('apps/') && !file.startsWith('packages/'));

    if (isRootFile) {
      console.log(`  - ${file} → root`);
      affectedWorkspaces.add('root');
      continue;
    }

    // Check workspace patterns
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

// Analyze commits and determine version bump
function analyzeCommits(commits) {
  let highestBumpType = 'none';

  // Define verb patterns for different types of changes
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

  // Track version changes for logging
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

    // Check for breaking changes - highest priority
    if (lowerCommit.includes('breaking change') || lowerCommit.includes('!:')) {
      commitBumpType = 'major';
      if (highestBumpType !== 'major') {
        tempMajor++;
        tempMinor = 0;
        tempPatch = 0;
      }
      highestBumpType = 'major';
    }
    // Check for features - medium priority
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
    // Check for patches - lowest priority
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
    // Default to patch for unmatched commit types
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

// Update version based on commit analysis
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
    return null; // Return null instead of exiting
  }
  return newVersion;
}

// Main execution
// First, detect changed files and affected workspaces
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

// Then, analyze commits to determine version bump
let newVersion = updateVersion();

// If no version bump from commit messages but we have affected workspaces,
// automatically bump patch version
if (!newVersion) {
  const currentVersion = `${major}.${minor}.${patch}`;
  const autoPatchVersion = `${major}.${minor}.${patch + 1}`;
  console.log(`\nNo version bump detected from commit messages, but files changed in affected workspaces.`);
  console.log(`Auto-bumping patch version: ${currentVersion} → ${autoPatchVersion}`);
  newVersion = autoPatchVersion;
}

// Update package.json files only for affected workspaces
const updatedFiles = updateAffectedPackageJsonFiles(newVersion, affectedWorkspaces);

if (updatedFiles.length === 0) {
  console.log('\nNo package.json files to update');
  process.exit(0);
}

// Save the current commit as last processed
saveLastProcessedCommit();

console.log(`\n✓ Version upgraded to ${newVersion} in ${updatedFiles.length} package(s)`);
console.log('✓ Last processed commit saved to .version-lock'); 