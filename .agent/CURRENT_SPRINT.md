# CURRENT SPRINT

## Goal
Phase 3 (v0.3): Supabase Auth + GitHub 401 자동 재연결 + UI 폴리싱

## Active Task
- **ID**: phase3-auth-rls-ui-polish
- **Branch**: main (단일 브랜치)
- **Status**: ✅ Auth + RLS + GitHub 401 + UI 수정 완료 (빌드 통과)
- **Worktree**: N/A

## Key Decisions
- **프레임워크**: Vite 7.3.1 + React 19.2 + TypeScript 5.9.3
- **Git**: main 브랜치만 사용 (빠른 개발)
- **패키지 매니저**: npm
- **스타일링**: Tailwind CSS + shadcn/ui (CSS Variables 기반)
- **백엔드**: Supabase Cloud
- **인증**: Supabase Auth + GitHub OAuth (별도 OAuth App 생성 필요)
- **GitHub API 토큰**: 8시간 만료 → 401 감지 + 재연결 버튼 (자동 갱신 불가, 서버 필요)
- **Supabase Auth 세션**: supabase-js가 JWT 자동 갱신 → 수동 refresh 불필요
- **RLS**: 모든 테이블 user_id = auth.uid() 정책 적용
- **오케스트레이션 전제**: Git 정보 refresh를 동작 전 매번 실행해야 함 (메모)

## Completed (Phase 1 — Foundation)
- [x] .agent 템플릿 커스터마이징
- [x] Vite + React + TS scaffolding
- [x] 보라톤 디자인 토큰 적용
- [x] 폴더 구조 (features/, components/, lib/, types/, hooks/)
- [x] TypeScript 인터페이스 (types/index.ts, types/database.ts)
- [x] AppLayout + Dashboard, Supabase 클라이언트
- [x] Data Layer (hooks: useWorkItems, useEventLogs, useSessionLog, useFixedEvents, useProjectDeadlines)
- [x] CRUD 함수 + 명령 실행기

## Completed (Phase 2 — 6탭 뷰)
- [x] 6탭 뷰 시스템 구현 (Release Plan, Active Task, Log, Timeline, Settings, Dashboard)
- [x] GitHub App 연동 (레포 import, 프로젝트 관리)
- [x] Plan CRUD (TaskType 3종, Priority, Goals, DueDate)
- [x] ReleasePlanView 2-column 그리드 + Backlog/Active/Completed 프로젝트 분류

## Completed (Phase 3 — Auth + RLS + UI)
- [x] Supabase Auth (useAuth, AuthGuard, LoginPage — GitHub OAuth)
- [x] 8개 테이블 RLS user_id 정책 전환 (006_add_user_id_rls.sql)
- [x] plans/projects/eventLogs INSERT 시 user_id 자동 주입
- [x] 레거시 데이터 정리 SQL (007_cleanup_legacy_data.sql) — 실행 완료
- [x] GitHub API 401 감지 → token-expired 이벤트 + 재연결 버튼
- [x] AppLayout 사용자 아바타 + 로그아웃 버튼
- [x] 모달 UI 통일 (배경 투명도, 스크롤바 제거, private 배지 빨간색)
- [x] 레포 이름 org/ + 빨간색 배지 표시
- [x] Settings 레포 리스트 글씨/칸 크기 증가
- [x] 사이드바 탭 크기 증가 (패딩 + 아이콘)
- [x] New Plan 가로폭 확대 (max-w-lg → max-w-2xl)

## Files in Focus
- `src/hooks/useAuth.ts` — Supabase Auth 상태 관리
- `src/components/auth/AuthGuard.tsx` — 라우트 보호
- `src/components/auth/LoginPage.tsx` — GitHub OAuth 로그인 UI
- `src/lib/supabase/auth.ts` — requireUserId 유틸
- `src/lib/github/githubApi.ts` — 401 감지 + GitHubTokenExpiredError
- `src/hooks/useGitHub.ts` — tokenExpired + reconnect
- `src/components/views/SettingsView.tsx` — 토큰 만료 경고 + 레포 리스트
- `src/components/dashboard/ProjectImportModal.tsx` — 레포 import
- `src/components/dashboard/PlanCreateModal.tsx` — Plan 생성 모달
- `src/components/common/AppLayout.tsx` — 사이드바 + 아바타 + 로그아웃

## Blockers
- 없음

## Next Steps
1. 오케스트레이션 동작 정의 (Git 정보 기반 자동 작업 생성)
2. 뷰 간 데이터 연동 강화 (Dashboard ↔ Release Plan 진행률 동기화)
3. 모바일 반응형 개선 (사이드바 오버레이 + 터치 제스처)
4. E2E 테스트 작성

---
*Last updated: 2026-02-19T12:27 KST*
*This file is used for immediate context recovery at session start.*
*Update this file when switching tasks.*
