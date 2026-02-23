---
description: Check status at session start
---

// turbo-all

1. Check current directory
   `pwd`

2. Check Git status
   `git status --short`

3. Check branch
   `git branch -v`

4. Check active processes
   `lsof -i :3000,5173,8080 2>/dev/null || echo "No active servers"`

5. Check current sprint
   `cat .agent/CURRENT_SPRINT.md 2>/dev/null || echo "No sprint file"`

6. Check project task.md (if exists)
   `cat task.md 2>/dev/null || echo "No project task.md"`

7. **Brain task.md 확인 (세션 간 핸드오프)**
   이전 대화에서 작업 중이던 brain task.md가 있는지 확인:
   `ls -la ~/.gemini/antigravity/brain/*/task.md 2>/dev/null | tail -5 || echo "No brain tasks found"`

   - 이전 세션의 task.md가 있으면 내용을 읽고 진행 상태 파악
   - `[/]` (진행 중), `[ ]` (미완료) 항목 확인
   - 사용자에게 이어서 진행할지 확인
