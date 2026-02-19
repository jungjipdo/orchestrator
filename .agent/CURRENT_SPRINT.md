# CURRENT SPRINT

## Goal
Phase 1: 멀티유저 SaaS 전환 준비 — 레거시 정리 + 제품화 기반 마련

## Active Task
- **ID**: phase1-product-pivot
- **Branch**: main (단일 브랜치)
- **Status**: 📝 제품 방향 전환 결정, 문서 업데이트 완료
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
- **라우팅**: SPA 내부 상태 기반 (activeTab state)

## Completed (Foundation)
- [x] .agent 템플릿 커스터마이징
- [x] Vite + React + TS scaffolding
- [x] 보라톤 디자인 토큰 적용
- [x] 폴더 구조 (features/, components/, lib/, types/, hooks/)
- [x] TypeScript 인터페이스 (types/index.ts, types/database.ts)
- [x] AppLayout + Dashboard, Supabase 클라이언트
- [x] Data Layer (hooks: useWorkItems, useEventLogs, useSessionLog, useFixedEvents, useProjectDeadlines)
- [x] CRUD 함수

## Completed (6탭 뷰)
- [x] `@radix-ui/react-tabs`, `@radix-ui/react-select` 설치
- [x] `tabs.tsx`, `select.tsx` UI 컴포넌트
- [x] `AppLayout.tsx` — 6탭 ViewType + renderContent 분기 + Settings 하단 분리
- [x] `ReleasePlanView.tsx` — Active Releases + Pipeline Stages
- [x] `ActiveTaskView.tsx` — AI Automation Hub
- [x] `LogView.tsx` — 전체 이벤트 로그 + 필터
- [x] `TimelineView.tsx` — 주간 캘린더
- [x] `SettingsView.tsx` — Placeholder
- [x] `Dashboard.tsx` 경량화

## Completed (제품 방향 전환)
- [x] 제품 방향 결정: 멀티-에이전트 컨트롤 타워 SaaS
- [x] PROJECT.md 전면 개편 (제품 관점)
- [x] README.md 전면 개편 (제품 소개)
- [x] PHASES.md 전면 개편 (제품화 로드맵)

## Files in Focus
- `.agent/PROJECT.md` — 제품 컨텍스트 (업데이트 완료)
- `.agent/PHASES.md` — 로드맵 (업데이트 완료)
- `README.md` — 제품 소개 (업데이트 완료)

## Blockers
- 없음

## Next Steps (Phase 1 — 제품화 기반)
1. 레거시 코드 제거:
   - `features/scheduler/slotCalculator.ts`, `conflictDetector.ts`, `priorityEngine.ts`
   - `components/command/CommandBar.tsx`, `CommandResult.tsx`, `CommandToolbar.tsx`, `SuggestionPanel.tsx`
   - `components/common/TimeBlock.tsx`, `components/dashboard/ScheduleSlot.tsx`
   - `types/index.ts` 내 Command/Schedule 관련 타입
2. 오케스트레이션 핵심 로직 설계 + 구현
3. Auth 시스템 (GitHub OAuth)
4. 테이블 `user_id` + RLS 정책

---
*Last updated: 2026-02-19T13:38 KST*
*This file is used for immediate context recovery at session start.*
*Update this file when switching tasks.*
