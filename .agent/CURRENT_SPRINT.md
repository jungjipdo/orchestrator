# CURRENT SPRINT

## Goal
Phase 1: 멀티유저 SaaS 전환 준비 — 레거시 정리 + 제품화 기반 마련

## Active Task
- **ID**: phase-3-tauri-desktop
- **Branch**: main (단일 브랜치)
- **Status**: ✅ Phase 3a 완료 — Tauri 초기화 + PKCE OAuth + 시스템 트레이
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

## Completed (Phase 3a — Tauri Desktop)
- [x] Tauri v2 프로젝트 초기화 (`src-tauri/`)
- [x] PKCE OAuth: Rust 로컬 콜백 서버 → Chrome→앱 세션 전달
- [x] tauri-plugin-opener + tauri-plugin-shell 설치
- [x] Supabase client flowType pkce 전환
- [x] 시스템 트레이 아이콘 (메뉴바 상주: 열기/종료)
- [x] Chrome 새 창 열기 (`open -na 'Google Chrome'`)
- [x] 인증완료 페이지 개선 (이모지 제거 + 브랜딩)
- [x] orchx watch 무한루프 수정 + sync repo_full_name 파싱
- [x] Project Activity 자동 추적 (useProjectActivity, ProjectActivityBadge)

## Files in Focus
- `src-tauri/src/lib.rs` — Tauri 메인 (시스템 트레이 + OAuth command)
- `src-tauri/src/oauth.rs` — Rust 로컬 콜백 서버
- `src/hooks/useAuth.ts` — PKCE OAuth 플로우
- `src/hooks/useGitHub.ts` — triggerOAuth PKCE 분기
- `src/lib/tauri/openExternal.ts` — Tauri 환경 감지 유틸

## Blockers
- ⚠️ Supabase Dashboard → Redirect URLs에 `http://127.0.0.1` 추가 필요 (PKCE 콜백용)

## Next Steps (Phase 3b~4)
1. **3b. orchx sidecar** — `pkg`로 바이너리 패키징 + `externalBin` 등록
2. **3c. 로컬 SQLite** — `tauri-plugin-sql` + cli_events 로컬 저장
3. **4a. 랜딩페이지** — 웹 첫 페이지 (앱 다운로드 + 웹 접속)
4. **4b. CI/CD** — GitHub Actions → `.dmg` 자동 빌드 + Releases 업로드

## Brain Task Reference
- Conversation ID: 6bf879c1-9bbb-42f4-9d5d-5585efde8cbe
- Task Path: `~/.gemini/antigravity/brain/6bf879c1-9bbb-42f4-9d5d-5585efde8cbe/task.md`
- Status: 진행중 (Phase 3a 완료, 3b/3c/4a/4b 미착수)

---
*Last updated: 2026-02-24T01:38 KST*
*This file is used for immediate context recovery at session start.*
*Update this file when switching tasks.*
