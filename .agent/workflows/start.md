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
   - If previous session's task.md exists, read it and check `[/]` (in-progress) and `[ ]` (todo) items
   - Ask user whether to continue from where we left off
