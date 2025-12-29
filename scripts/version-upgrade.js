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

// Function to update all package.json files with new version
function updateAllPackageJsonFiles(version) {
  const packageJsonFiles = findAllPackageJsonFiles();
  const updatedFiles = [];

  console.log(`\nFound ${packageJsonFiles.length} package.json file(s):`);

  for (const filePath of packageJsonFiles) {
    try {
      const packageJson = JSON.parse(readFileSync(filePath, 'utf8'));

      // Only update if the file has a version field
      if (packageJson.version) {
        const oldVersion = packageJson.version;
        packageJson.version = version;
        writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');

        const relativePath = relative(process.cwd(), filePath);
        console.log(`  ✓ Updated ${relativePath}: ${oldVersion} → ${version}`);
        updatedFiles.push(relativePath);
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
    console.log('No version bump needed, skipping...');
    process.exit(0);
  }
  return newVersion;
}

// Main execution
const newVersion = updateVersion();

if (newVersion) {
  // Update all package.json files in monorepo
  const updatedFiles = updateAllPackageJsonFiles(newVersion);

  // Save the current commit as last processed
  saveLastProcessedCommit();

  console.log(`\n✓ Version upgraded to ${newVersion} in ${updatedFiles.length} package(s)`);
  console.log('✓ Last processed commit saved to .version-lock');
} 