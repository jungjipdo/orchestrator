# DEVELOPMENT PHASES

> Orchestrator 프로젝트 개발 로드맵 (project_start.md 14절 기반)

---

## Phase 1 (v0.1): Core — 메인 대시보드 + 명령 루프

> 최소 실행 가능한 개인 컨트롤 타워

### 기능 범위
- 메인페이지 단일 화면 (대시보드)
- 명령 루프 (`/capture`, `/plan`, `/focus`, `/close`, `/review`)
- 이벤트 로그 시스템
- 고정 일정(Hard Event) + 기한 반영 스케줄링
- 상태 모델: `backlog → candidate → active → done | blocked | deferred`
- 보라톤 디자인 시스템 (Dark/Light)

### 개발 프로세스

#### Design
- [ ] 요구사항 분석 (project_start.md)
- [ ] 인터페이스/타입 정의 (types/)
- [ ] `task.md` + `implementation_plan.md` 작성
- [ ] 사용자 승인

#### Implementation
- [ ] 프로젝트 scaffolding (Vite + React + TS)
- [ ] 디자인 토큰 + CSS Variables
- [ ] 대시보드 레이아웃
- [ ] 명령 인터페이스
- [ ] 스케줄링 엔진
- [ ] Supabase 스키마 + 연결
- [ ] 이벤트 로그

#### Testing
- [ ] 타입 체크 (tsc --noEmit)
- [ ] 빌드 성공 (vite build)
- [ ] 브라우저 테스팅

---

## Phase 2 (v0.2): Mobile — PWA + 앱 연동

### 기능 범위
- PWA 안정화 (vite-plugin-pwa)
- iPhone 간략 UI (동일 기능, 축소 표시)
- Re-mind / Planfit 앱 연동 학습 워크플로우
- AI 제안 UX (옵션 A/B/C)

---

## Phase 3 (v0.3): Intelligence — 멀티모델 + 리포트

### 기능 범위
- LLM 어댑터 라우팅 고도화 (Gemini/Codex/OpenAI)
- 주간/월간 리포트 자동화
- 패턴 분석 + 개선안 제시
- 일정 충돌 분석 고도화

---

## Phase 4 (v1.0): Scale — 외부 앱 + 자동화

### 기능 범위
- 외부 앱 확장 (external_apps 스키마)
- 승인형 자동화 범위 확대
- 오프라인 고도화
- 알림/위젯 고도화

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
