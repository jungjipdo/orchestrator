---
description: Check status at session start
---

// turbo-all

1. Check current directory
   `pwd`

2. Check Git status
   `git status`

3. Check branch
   `git branch -v`

4. Check active processes
   `lsof -i :3000,5173,8080 2>/dev/null || echo "No active servers"`

5. Check current sprint
   `cat .agent/CURRENT_SPRINT.md 2>/dev/null || echo "No sprint file"`

6. Check task.md
   `cat task.md 2>/dev/null || echo "No task.md found"`
