# CURRENT SPRINT

## Goal
Phase 1: 멀티유저 SaaS 전환 준비 — 레거시 정리 + 제품화 기반 마련

## Active Task
- **ID**: phase-3-bugfix-watcher-delete
- **Branch**: main (단일 브랜치)
- **Status**: ✅ 프로젝트 삭제 + Watcher 이벤트 로그 + CLI Monitor 실시간 이벤트 + 모델 설정 수정 완료
- **Worktree**: N/A

## Key Decisions
- **제품 포지셔닝**: "AI 에이전트들이 날뛸 수 있는 몸통" — 멀티-에이전트 컨트롤 타워 SaaS
- **참고 모델**: OpenClaw (멀티 에이전트 연결) — 단, 작업 관리 + 시각화에 특화
- **핵심 차별점**: 시각화 품질 + 세션 관리 위탁
- **타겟**: Vibe Coder / 1인 개발자 → 소규모 팀
- **프레임워크**: Vite 7.3.1 + React 19.2 + TypeScript 5.9.3
- **Git**: main 브랜치만 사용
- **스타일링**: Tailwind CSS + shadcn/ui (CSS Variables 기반)
- **백엔드**: Supabase Cloud
- **Desktop**: Tauri v2 + PKCE OAuth (외부 Chrome 로그인)
- **라우팅**: SPA 내부 상태 기반 (activeTab state)
- **서브태스크 저장**: Plan → `metadata.detail_plan.sub_tasks[]`, Project → 동일 패턴
- **AI Review**: 정해진 `ReviewSnapshot` 입력 + `ReviewResult` 스키마 출력 방식

## Completed (이번 세션)
- [x] `db_delete_project` Tauri 커맨드 추가 (프로젝트 실제 삭제)
- [x] `useProjects.removeProject` → `db_delete_project` 호출로 변경
- [x] ReleasePlanView DnD Kit 마이그레이션 + 삭제 모드 클릭 수정
- [x] watcher.rs 파일변경 이벤트 상세 로그 (RAW/emit/Supabase)
- [x] SyncClient 초기화: CWD + exe 디렉토리 fallback 로직
- [x] useCliEvents Tauri `orchx:file-change` 실시간 리스너 추가
- [x] CliMonitorPanel `payload.file` 키 표시 지원
- [x] GPT-5.3 → CODEX-5.3 이름 변경
- [x] antigravity 지원 모델에서 grok_code, kimi_2_5 제거
- [x] CLI Monitor 실시간 이벤트 시각 확인 완료
- [x] 디버그 로그 정리 (TS console.log 22개 + Rust log::info 12개 경량화)

## Files in Focus
- `src-tauri/src/lib.rs` — SyncClient 초기화 + db_delete_project
- `src-tauri/src/watcher.rs` — 파일변경 이벤트 로그
- `src/hooks/useProjects.ts` — removeProject 실제 삭제
- `src/hooks/useCliEvents.ts` — Tauri 이벤트 리스닝
- `src/components/views/ReleasePlanView.tsx` — DnD Kit 리팩토링

## Blockers
- ⚠️ `.env.local` Supabase 키는 있으나 SyncClient CWD가 맞지 않을 수 있음 (exe fallback 추가됨, 테스트 필요)
- ⚠️ CLI Monitor에서 Tauri 실시간 이벤트가 UI에 렌더링되는지 최종 시각 확인 필요

## Next Steps
1. **3b Step 5. orchx CLI 모드** — clap 서브커맨드 유지
2. **3b. orchx sidecar** — `pkg`로 바이너리 패키징 + `externalBin` 등록
3. **4a. 랜딩페이지** — 웹 첫 페이지 (앱 다운로드 + 웹 접속)
4. **H4. 위반 이벤트 서버 보고** → 대시보드 표시 (E2E 검증)
5. **H6. Eval Harness** — 회귀셋 20개 + KPI 수집

## Brain Task Reference
- Conversation ID: 3848edcf-55a1-49e5-a700-66e89a7b532a
- Task Path: `~/.gemini/antigravity/brain/3848edcf-55a1-49e5-a700-66e89a7b532a/task.md`
- Status: 완료

---
*Last updated: 2026-02-26T10:20 KST*
*This file is used for immediate context recovery at session start.*
*Update this file when switching tasks.*
