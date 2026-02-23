---
description: End-of-session handoff preparation
---

# /end — Session Close Checklist

## Steps

1. **Check git status**
// turbo
```bash
git status --short && git log --oneline -5
```

2. **Commit uncommitted changes**
   - Split into logical units, use Conventional Commits
   - `git push`

3. **Update CURRENT_SPRINT.md**
   Update: Goal, Active Task (status), Completed, Files in Focus, Blockers, Next Steps, timestamp.

4. **Update brain task.md**
   - Mark `[x]` completed, `[/]` in-progress
   - Add new discoveries/issues
   - **NEVER** use `Overwrite: true` — use `replace_file_content` only

5. **Record brain task path in CURRENT_SPRINT.md**
   ```markdown
   ## Brain Task Reference
   - Conversation ID: <id>
   - Task Path: `~/.gemini/antigravity/brain/<id>/task.md`
   - Status: <in-progress / done>
   ```

6. **Output session summary** (via notify_user)
   ```
   ## Session Summary
   ### Completed
   ### In Progress
   ### Next Session TODO
   - Brain task.md path: `~/.gemini/antigravity/brain/<id>/task.md`
   ### Notes
   ```
