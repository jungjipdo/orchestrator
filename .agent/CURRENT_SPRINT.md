# CURRENT SPRINT

## Goal
Phase 2 (v0.2): 6탭 뷰 시스템 구현 — 사이드바 네비게이션 + 독립 뷰 컴포넌트

## Active Task
- **ID**: phase2-six-tab-views
- **Branch**: main (단일 브랜치)
- **Status**: ✅ 6탭 뷰 구현 완료 (빌드 + 브라우저 검증 통과)
- **Worktree**: N/A

## Key Decisions
- **프레임워크**: Vite 7.3.1 + React 19.2 + TypeScript 5.9.3
- **Git**: main 브랜치만 사용 (빠른 개발)
- **패키지 매니저**: npm
- **스타일링**: Tailwind CSS + shadcn/ui (CSS Variables 기반)
- **백엔드**: Supabase Cloud
- **UI 컴포넌트**: Radix UI (Tabs, Select) + Lucide React
- **라우팅**: SPA 내부 상태 기반 (activeTab state, React Router 아님)

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
- [x] `@radix-ui/react-tabs`, `@radix-ui/react-select` 설치
- [x] `tabs.tsx`, `select.tsx` UI 컴포넌트 복사 + import 수정
- [x] `AppLayout.tsx` — 6탭 ViewType + renderContent 분기 + Settings 하단 분리
- [x] `ReleasePlanView.tsx` — Active Releases (project별 그룹핑) + Pipeline Stages
- [x] `ActiveTaskView.tsx` — AI Automation Hub (4 metrics + Insights + Automation Tasks)
- [x] `LogView.tsx` — 전체 이벤트 로그 + actor/type 필터
- [x] `TimelineView.tsx` — 주간 캘린더 + 날짜별 이벤트/데드라인/작업
- [x] `SettingsView.tsx` — Placeholder (Supabase/LLM/Schedule)
- [x] `Dashboard.tsx` 경량화 — 뷰 전환 로직 제거, 요약 뷰만 유지
- [x] tsc --noEmit ✅ / npm run build ✅ / 브라우저 6탭 전환 ✅

## Files in Focus
- `src/components/common/AppLayout.tsx` — 6탭 사이드바 + 뷰 분기
- `src/components/dashboard/Dashboard.tsx` — 요약 대시보드
- `src/components/views/ReleasePlanView.tsx` — Release Plan
- `src/components/views/ActiveTaskView.tsx` — AI Automation Hub
- `src/components/views/LogView.tsx` — Event Log + 필터
- `src/components/views/TimelineView.tsx` — 캘린더 + 스케줄
- `src/components/views/SettingsView.tsx` — Settings (placeholder)

## Blockers
- 없음

## Next Steps
1. Settings 뷰 실제 구현 (Supabase URL/Key 설정, LLM API Key, 스케줄 기본값)
2. 뷰 간 데이터 연동 강화 (Dashboard ↔ Release Plan 간 진행률 동기화)
3. 모바일 반응형 개선 (사이드바 오버레이 + 터치 제스처)
4. E2E 테스트 작성 (Playwright 또는 Cypress)
5. git commit & push

---
*Last updated: 2026-02-18T15:25 KST*
*This file is used for immediate context recovery at session start.*
*Update this file when switching tasks.*
