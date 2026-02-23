---
description: 세션 종료 시 현재 상태 요약 및 핸드오프 준비
---

# /end — 세션 종료 체크리스트

세션 종료 시 다음 conversation으로 컨텍스트를 넘기기 위한 workflow.

## Steps

1. **Git 상태 확인**
// turbo
```bash
git status --short && git log --oneline -5
```

2. **미커밋 변경사항 정리**
- 변경사항이 있으면 논리적 단위로 나눠서 커밋
- Conventional Commits 형식 사용
- `git push` 진행

3. **CURRENT_SPRINT.md 업데이트**
파일: `.agent/CURRENT_SPRINT.md`
업데이트 항목:
- `## Goal` — 현재 목표 (변경 시 갱신)
- `## Active Task` — Status를 최신 상태로
- `## Completed` — 이번 세션에서 완료한 항목 추가
- `## Files in Focus` — 이번 세션에서 주로 작업한 파일
- `## Blockers` — 현재 블로커
- `## Next Steps` — 다음 세션에서 이어갈 작업
- `*Last updated*` 타임스탬프 갱신

4. **Brain task.md 업데이트** (세션 간 핸드오프 핵심)
- 완료 항목 `[x]`, 진행 중 `[/]` 마킹
- 새로운 발견/이슈 추가
- **CRITICAL**: `Overwrite: true`로 덮어쓰지 말고 `replace_file_content`로 수정

5. **CURRENT_SPRINT.md에 brain task.md 경로 기록**
다음 세션에서 바로 찾을 수 있게 CURRENT_SPRINT.md에 추가:
```markdown
## Brain Task Reference
- Conversation ID: <현재 대화 ID>
- Task Path: `~/.gemini/antigravity/brain/<conversation-id>/task.md`
- Status: <진행중 / 완료>
```

6. **세션 요약 출력** (notify_user)
다음 형식으로 사용자에게 요약:
```
## 세션 요약
### 완료
- (이번 세션에서 완료한 항목)

### 진행 중 / 미완료
- (아직 끝나지 않은 항목)

### 다음 세션 TODO
- (다음 대화에서 이어갈 작업)
- Brain task.md 경로: `~/.gemini/antigravity/brain/<id>/task.md`

### 참고사항
- (기억해야 할 결정사항, 메모)
```
