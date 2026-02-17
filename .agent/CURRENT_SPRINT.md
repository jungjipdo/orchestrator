# CURRENT SPRINT

## Goal
Phase 1 (v0.1): 메인페이지 단일 화면 + 명령 루프 + 고정 일정/기한 반영 스케줄링

## Active Task
- **ID**: phase1-foundation-complete
- **Branch**: main (단일 브랜치)
- **Status**: Foundation 완료 → Data Layer 진행 예정
- **Worktree**: N/A

## Key Decisions
- **프레임워크**: Vite 7.3.1 + React 19.2 + TypeScript 5.9.3
- **Git**: main 브랜치만 사용 (빠른 개발)
- **패키지 매니저**: npm
- **스타일링**: Vanilla CSS + CSS Variables (보라톤 팔레트)
- **백엔드**: Supabase Cloud (Free tier → 추후 Local 전환 가능)
- **디자인**: Dark BG #000000 / Light BG #FFFFFF

## Completed
- [x] .agent 템플릿 커스터마이징
- [x] Vite + React + TS scaffolding
- [x] 보라톤 디자인 토큰 (CSS Variables) 적용
- [x] 폴더 구조 생성 (features/, components/, lib/, types/, hooks/, styles/)
- [x] **1.1** TypeScript 인터페이스 정의 (types/index.ts, types/database.ts)
- [x] **1.2** React Router v7 + AppLayout + Dashboard 분리
- [x] **1.3** Supabase 클라이언트 설정 (env.d.ts, .env.local)
- [x] useTheme 훅 분리
- [x] tsc --noEmit ✅ / npm run build ✅ / 브라우저 검증 ✅

## Files in Focus
- `src/types/index.ts` — 전체 타입 정의
- `src/types/database.ts` — DB Row/Insert/Update 타입
- `src/router.tsx` — React Router 설정
- `src/components/common/AppLayout.tsx` — 공통 레이아웃
- `src/components/dashboard/Dashboard.tsx` — 대시보드
- `src/lib/supabase/client.ts` — Supabase 클라이언트
- `src/hooks/useTheme.ts` — 테마 관리 훅

## Blockers
- Supabase Cloud 프로젝트 미생성 (URL/Key 필요)

## Next Steps
1. Supabase Cloud 프로젝트 생성 + .env.local 값 설정
2. Supabase 스키마 마이그레이션 (work_items, fixed_events 등)
3. 데이터 접근 레이어 (CRUD 함수 + React Hooks)
4. 상태 머신 + 스케줄링 엔진
5. 명령 인터페이스 구현

---
*This file is used for immediate context recovery at session start.*
*Update this file when switching tasks.*
