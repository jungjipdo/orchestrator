---
description: Check status at session start
---

// turbo-all

1. `pwd`

2. `git status --short`

3. `git branch -v`

4. `lsof -i :3000,5173,8080 2>/dev/null || echo "No active servers"`

5. `cat .agent/CURRENT_SPRINT.md 2>/dev/null || echo "No sprint file"`

6. **Check brain task.md for session handoff**
   `ls -la ~/.gemini/antigravity/brain/*/task.md 2>/dev/null | tail -5 || echo "No brain tasks"`
   - If CURRENT_SPRINT.md has a `Brain Task Reference` section, read that specific task.md
   - Otherwise, read the most recent task.md by modification time

7. **Create new session task.md (MANDATORY)**
   - Read the previous session's task.md (from step 6)
   - Extract ALL `[ ]` (todo) and `[/]` (in-progress) items
   - Create a NEW task.md in `~/.gemini/antigravity/brain/<current-conversation-id>/task.md`
   - Structure: "이번 세션 완료" (empty) + carried-over incomplete items grouped by phase/section
   - This is NOT optional — every session MUST have its own task.md with inherited incomplete work
