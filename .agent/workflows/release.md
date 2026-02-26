---
description: Release a new desktop app version (tag → GitHub Actions → .dmg)
---

# /release — Desktop App Release Workflow

// turbo-all

## Steps

1. Check current versions match:
   ```
   grep '"version"' src-tauri/tauri.conf.json package.json
   ```
   - Both files MUST have the **same version number**.

2. If releasing a NEW version (not a re-publish):
   - Bump version in `src-tauri/tauri.conf.json` (field: `"version"`)
   - Bump version in `package.json` (field: `"version"`)
   - Use semver: `MAJOR.MINOR.PATCH` (e.g., `0.1.0` → `0.2.0`)
   - Commit: `git add -A && git commit -m "chore(release): bump version to <new_version>"`
   - Push: `git push`

3. Create and push the git tag:
   ```
   git tag v<VERSION> && git push --tags
   ```
   - `<VERSION>` = the version from step 1 or 2 (e.g., `v0.2.0`)

4. If RE-PUBLISHING the same version (e.g., build failed):
   - Delete the old tag first:
   ```
   git tag -d v<VERSION>
   git push origin :refs/tags/v<VERSION>
   ```
   - Delete the failed draft release on GitHub Releases page (if exists)
   - Then re-create: `git tag v<VERSION> && git push --tags`

5. Monitor the build:
   - Open: `https://github.com/jungjipdo/orchestrator/actions`
   - Wait for the "Publish Desktop App" workflow to complete (≈10-15 min)
   - ✅ = macOS .dmg built + uploaded to GitHub Releases as **draft**

6. Finalize the release:
   - Go to: `https://github.com/jungjipdo/orchestrator/releases`
   - Find the **draft** release
   - Review the attached `.dmg` file
   - Edit release notes if needed
   - Click **"Publish release"** to make it public

## Quick Reference

| Action | Command |
|--------|---------|
| New release | Bump version → commit → `git tag v0.2.0 && git push --tags` |
| Re-publish | `git tag -d v0.1.0 && git push origin :refs/tags/v0.1.0` → re-tag |
| Check build | `https://github.com/jungjipdo/orchestrator/actions` |
| Publish draft | `https://github.com/jungjipdo/orchestrator/releases` → Publish |
