# Orchestrator

AI 에이전트들이 날뛸 수 있는 몸통을 만들어주는 **멀티-에이전트 컨트롤 타워**.

작업 관리에 특화된 AI 오케스트레이션 SaaS로, Vibe Coder와 1인 개발자가 여러 AI 코딩 에이전트의 작업 흐름을 **하나의 대시보드**에서 시각화하고 관리할 수 있습니다.

## 왜 필요한가?

Cursor, Codex, Claude Code, Windsurf — AI 코딩 도구가 폭발적으로 늘고 있지만, **에이전트들의 작업을 통합 관리하는 도구**는 없습니다.

- 기존 PM 도구(Notion, Linear)는 **AI 에이전트를 이해하지 못함**
- OpenClaw 같은 에이전트 허브는 **작업 시각화가 부족**
- 우리는 **에이전트 연결 + 작업 시각화 + 세션 관리**를 하나로 합침

## 핵심 기능

### 🤖 멀티-에이전트 연결
- 사용자의 AI 에이전트(Cursor, Codex, Claude Code 등)를 등록하고 연결
- 에이전트별 작업 상태 실시간 추적
- 에이전트 간 작업 충돌 감지 + 알림

### 📊 작업 흐름 시각화
- 프로젝트별 진행 상태 대시보드
- 에이전트 활동 타임라인
- 상태 모델: `backlog → candidate → active → done | blocked | deferred`

### 🎯 세션 관리
- 에이전트 작업 세션 기록 및 추적
- 완료/차단/지연 이벤트 자동 로깅
- 프로젝트 간 맥락 전환 지원

### 🔗 GitHub 연동
- 프로젝트 소스 연결
- Commit/PR 기반 진행 상황 자동 수집

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Vite 7 + React 19 (SPA) |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (DB + Auth + Realtime) |
| AI | Gemini API + Codex Bridge (LLMAdapter 패턴) |

## 시작하기

### 1) 의존성 설치

```bash
npm install
```

### 2) 환경변수 설정

루트에 `.env.local` 생성:

```bash
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 3) 개발 서버 실행

```bash
npm run dev
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 실행 (HMR) |
| `npm run build` | 타입체크 + 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 |
| `npm run preview` | 빌드 결과 프리뷰 |

## 프로젝트 구조

```
src/
├── components/        # UI 컴포넌트
│   ├── auth/          # 인증
│   ├── common/        # 공통 위젯 + 레이아웃
│   ├── dashboard/     # 대시보드
│   ├── github/        # GitHub 연동
│   ├── ui/            # shadcn/ui
│   └── views/         # 탭 뷰 (ReleasePlan, ActiveTask, Log, Timeline, Settings)
├── features/          # 비즈니스 로직
│   ├── llm/           # LLM 어댑터
│   └── integration/   # 에이전트 연동
├── hooks/             # 커스텀 React hooks
├── lib/               # 유틸리티 + Supabase + GitHub API
├── types/             # TypeScript 인터페이스
└── App.tsx
```

## 데이터베이스

핵심 테이블:

| 테이블 | 설명 |
|--------|------|
| `plans` | Plan 시스템 (task/event/fixed/project) |
| `work_items` | 작업 상태 관리 |
| `event_logs` | 이벤트 파이프라인 + 에이전트 활동 로그 |
| `session_logs` | 에이전트 작업 세션 기록 |
| `fixed_events` | 고정 일정 |
| `project_deadlines` | 마감 + 리스크 점수 |

> ⚠️ Planfit과 동일한 Supabase 프로젝트를 공유합니다. 테이블 이름 충돌에 주의.

## 로드맵

- **Phase 1**: 핵심 전환 — 멀티유저 SaaS + Auth + RLS
- **Phase 2**: 차별화 — 에이전트 연결 시스템 + 활동 피드
- **Phase 3**: 네트워크 효과 — 워크플로우 템플릿 공유 + 팀 워크스페이스

## 라이선스

Private
