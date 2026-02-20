---
description: Analyze git status, infer commit message, and commit changes
---

# /commit — Auto Commit Workflow

## Steps

// turbo
1. Run `git status --short` to see all changed files.

// turbo
2. Run `git diff --stat` to understand the scope of changes.

// turbo
3. For each changed file, run `git diff <file> | head -80` to understand WHAT changed.

4. Based on the diffs, infer a **Conventional Commit** message:
   - **Format**: `<type>(<scope>): <summary>`
   - **Types**: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`, `perf`
   - **Scope**: component or area name (e.g., `release-plan`, `dashboard`, `auth`)
   - **Summary**: imperative, lowercase, no period
   - **Body**: bullet list of key changes (if more than a trivial change)
   - Keep the summary under 72 characters

5. Stage all changes with `git add -A`.

6. Commit with the inferred message. Use multi-line format for non-trivial changes:
   ```
   git commit -m "<type>(<scope>): <summary>

   - change 1
   - change 2
   - change 3"
   ```

7. Confirm the commit was successful by running `git log -1 --oneline`.
