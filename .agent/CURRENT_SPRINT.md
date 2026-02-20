# CURRENT SPRINT

## Goal
Phase 1: 멀티유저 SaaS 전환 준비 — 레거시 정리 + 제품화 기반 마련

## Active Task
- **ID**: codebase-cleanup
- **Branch**: main (단일 브랜치)
- **Status**: ✅ 완료 — 레거시 제거 + 문서 업데이트 + README 재작성
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

## Completed (Release Plan UX 리팩터링)
- [x] 좌(Projects&Plans) / 우(Active Releases) 50:50 레이아웃
- [x] 양쪽 모두 2-col 그리드
- [x] 프로젝트 상세 오버레이 모달 (반투명 배경 + slideUp 애니메이션)
- [x] 개별 삭제 버튼 제거 → 인라인 삭제 모드 (카드 클릭 선택 + 벌크 삭제)
- [x] Optimistic 드래그 (A↔B 전환 시 페이지 깜빡임 없음)
- [x] Active 카드 드래그로 비활성화 (B→A)
- [x] 텍스트 잘림 수정 (line-clamp-2, flex-wrap)
- [x] 섹션 순서: 드래그 제거 → Swap Order 버튼
- [x] 스크롤바 숨기기 (scrollbar-hide CSS)
- [x] `/commit` 워크플로우 추가

## Completed (코드베이스 정리)
- [x] 레거시 코드 제거 (scheduler, workflow, integration, llm)
- [x] PROJECT.md 현행화 (Auth 완료, 폴더 구조 반영)
- [x] PHASES.md 완료 항목 체크
- [x] README.md 재작성 (현재 기능 기준)
- [x] tsc + build 검증 통과

## Files in Focus
- `.agent/PROJECT.md` — 폴더 구조 + DB 섹션 현행화
- `.agent/PHASES.md` — Phase 1 완료 항목 체크
- `README.md` — 전면 재작성

## Blockers
- 없음

## Next Steps (Phase 1 — 제품화 기반)
1. 랜딩 페이지 설계 + 구현
2. 온보딩 플로우 (GitHub 연결 → 프로젝트 생성 → 첫 작업)
3. 멀티유저 시나리오 브라우저 테스팅

---
*Last updated: 2026-02-21T02:45 KST*
*This file is used for immediate context recovery at session start.*
*Update this file when switching tasks.*
