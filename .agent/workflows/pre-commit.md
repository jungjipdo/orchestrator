---
description: Pre-commit verification
---

1. Check changed files
   `git diff --stat`

// turbo
2. Type check
   `npx tsc --noEmit`

// turbo
3. Lint check
   `npm run lint`

4. Generate commit message
   Agent suggests Conventional Commit format
   
5. Execute commit
   `git add . && git commit -m "message"`
