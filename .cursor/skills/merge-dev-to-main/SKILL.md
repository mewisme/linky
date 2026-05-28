---
name: merge-dev-to-main
description: Merges `dev` into `main` while keeping `dev`, pushes `main` to origin, then switches back to `dev`. Detects the OS and uses the correct shell command style for Bash/sh or PowerShell. Use when the user asks to merge branches, keep source branch, and push to remote.
---

# Merge Dev To Main

## Purpose

Perform a safe, non-destructive branch merge from `dev` into `main`, keep `dev`, push `main` to `origin`, then return to `dev`.

## Workflow

1. Verify repository state before merging:
   - Confirm current branch and working tree status.
   - Stop and ask if there are uncommitted changes that could interfere.
2. Ensure local refs are up to date:
   - Fetch from `origin`.
3. Switch to `main`.
4. Merge `dev` into `main` with a normal merge commit policy.
5. Push `main` to `origin`.
6. Confirm `dev` still exists locally and remotely.
7. Switch back to `dev`.

## Command Execution Rule

- Run exactly one command at a time.
- Do not chain commands with `&&` or `;`.
- Wait for each command result before running the next command.

## OS Detection and Command Sets

Detect OS first, then run the matching command style.

### PowerShell (Windows)

```powershell
$isWindows = $PSVersionTable.Platform -eq "Win32NT" -or $env:OS -eq "Windows_NT"
```

If `$isWindows` is true, run these commands one-by-one:

1. `git status`
2. `git fetch origin`
3. `git checkout main`
4. `git merge dev`
5. `git push origin main`
6. `git branch --list dev`
7. `git ls-remote --heads origin dev`
8. `git checkout dev`

### Bash / sh (Linux/macOS)

```bash
OS_NAME="$(uname -s)"
```

If `OS_NAME` is `Linux` or `Darwin`, run these commands one-by-one:

1. `git status`
2. `git fetch origin`
3. `git checkout main`
4. `git merge dev`
5. `git push origin main`
6. `git branch --list dev`
7. `git ls-remote --heads origin dev`
8. `git checkout dev`

## Guardrails

- Never delete `dev`.
- Never use `git reset --hard`, force-push, or destructive history rewrites.
- If merge conflicts occur, stop and surface conflicted files for resolution.
- If `main` or `dev` does not exist, stop and ask how to proceed.

## Output Format

Return:

1. OS/shell path selected.
2. Merge result (`fast-forward` or `merge commit`).
3. Push result to `origin/main`.
4. Confirmation that `dev` still exists.
5. Confirmation that current branch is `dev`.
