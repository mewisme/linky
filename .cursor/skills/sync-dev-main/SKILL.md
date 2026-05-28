---
name: sync-dev-main
description: Syncs commits from `dev` to `main` and pushes `main` to `origin` using strictly one CLI command per step, while keeping `dev` unchanged. Use when asked to merge or sync `dev` into `main` and push remote changes without chaining commands.
disable-model-invocation: true
---

# Sync Dev Main

## Instructions

Use this workflow when the user asks to sync commits from `dev` to `main` and push to `origin`.

Rules:
- Run only one CLI command at a time.
- Never chain commands with `&&`, `;`, `|`, or multiline command blocks.
- Stop and report immediately if any command fails.
- Do not delete `dev` locally or remotely.
- Do not use destructive git commands.

## Command Sequence

1. Check current branch:
   - `git branch --show-current`
2. Fetch latest remote state:
   - `git fetch origin`
3. Switch to `main`:
   - `git checkout main`
4. Update local `main` from remote:
   - `git pull origin main`
5. Merge `dev` into `main`:
   - `git merge dev`
6. Push updated `main`:
   - `git push origin main`
7. Verify status:
   - `git status`
8. Switch back to `dev`:
   - `git checkout dev`

## Output Format

After execution, report:
- Current branch before sync
- Whether merge created a commit or was already up to date
- Push result
- Final `git status` summary
- Confirmation that branch is back on `dev`
