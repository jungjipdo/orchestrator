# DEVELOPMENT PHASES

> Orchestrator — 멀티-에이전트 컨트롤 타워 SaaS 로드맵

---

## Phase 1: Core Product — 멀티유저 SaaS 전환

> 1명의 외부 Vibe Coder가 가입해서 프로젝트를 만들고 작업을 관리할 수 있는 상태

### 기능 범위
- Auth 시스템 (GitHub OAuth)
- 모든 테이블에 `user_id` + RLS
- 랜딩 페이지 (왜 이 도구가 필요한지 → 가입)
- 온보딩 플로우 (프로젝트 생성 → GitHub 연결 → 첫 작업 생성)
- 레거시 코드 정리 (명령 시스템, 스케줄 슬롯 제거)
- 보라톤 디자인 시스템 (Dark/Light) 유지

### 개발 프로세스

#### Design
- [x] 제품화 요구사항 분석
- [x] Auth + 멀티테넌시 스키마 설계
- [ ] 랜딩 페이지 + 온보딩 UX 설계
- [x] `implementation_plan.md` 작성 → 승인

#### Implementation
- [x] 레거시 코드 제거 (scheduler, workflow, integration, llm)
- [x] Auth 시스템 (GitHub OAuth + Supabase Auth)
- [x] 테이블 `user_id` 추가 + RLS 정책
- [ ] 랜딩 페이지
- [ ] 온보딩 플로우

#### Testing
- [x] 타입 체크 (tsc --noEmit)
- [x] 빌드 성공 (vite build)
- [ ] 멀티유저 시나리오 브라우저 테스팅

---

## Phase 2: Differentiation — 에이전트 오케스트레이션

> Cursor/Codex 작업 흐름을 Orchestrator에서 추적할 수 있는 상태

### 기능 범위
- AgentConnection 시스템 (에이전트 등록 + 상태 추적)
- 에이전트 활동 피드 (Git commit/PR 기반 자동 추적)
- 프로젝트 간 작업 전환 대시보드
- 에이전트 세션 관리 (작업 시작/종료/차단 추적)
- 작업 흐름 시각화 강화

---

## Phase 3: Network Effect — 공유 생태계

> 워크플로우 템플릿을 다른 사용자와 공유할 수 있는 상태

### 기능 범위
- 워크플로우 템플릿 공유
- 커뮤니티 피드 (인기 워크플로우, 에이전트 설정)
- 팀 워크스페이스 (2~5인 소규모 팀)
- PWA 안정화 + 모바일 UI
- 수익 모델 구현 (Free/Pro/Team)

---

## 공통 규칙

### Testing (CRITICAL)
> ⚠️ **Testing은 선택이 아님. 모든 변경은 반드시 테스트.**

```bash
/verify          # 전체 검증
npx tsc --noEmit # 타입 체크
npm run build    # 빌드 체크
```

### Commit Convention
- feat: 새 기능
- fix: 버그 수정
- refactor: 리팩토링
- style: 스타일 변경
- docs: 문서
- chore: 설정/빌드

---
*Customize these phases as the project evolves.*
