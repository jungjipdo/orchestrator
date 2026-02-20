# Orchestrator

**Multi-Agent Control Tower** — AI 코딩 에이전트들의 작업 흐름을 하나의 대시보드에서 시각화하고 관리합니다.

<br/>

## 왜 Orchestrator인가?

AI 코딩 도구(Cursor, Claude Code, Codex, Windsurf)가 폭발적으로 늘고 있지만, 이 에이전트들의 **작업을 통합 관리하는 도구는 없습니다.**

- 기존 PM 도구(Notion, Linear)는 AI 에이전트를 이해하지 못합니다
- 에이전트 허브(OpenClaw 등)는 작업 시각화가 부족합니다
- 팀 단위 AI 워크플로우를 조율하는 레이어가 빠져 있습니다

Orchestrator는 **에이전트 연결 + 작업 시각화 + 세션 관리**를 하나로 합칩니다.

<br/>

## 주요 기능

### 📊 Dashboard
프로젝트 전체 현황을 한눈에 파악할 수 있는 요약 화면.

### 📋 Release Plan
Plan(Task/Event/Fixed/Project)을 생성하고, 드래그로 Active 상태를 관리. 좌우 2-컬럼 레이아웃으로 Plans & Projects와 Active Releases를 동시에 확인.

### 🤖 Orchestration
AI 모델 추천, 리스크 분석, Plan → AgentTask 분해 등 오케스트레이션 핵심 기능.
- **모델 추천**: 작업 유형에 따라 최적 AI 모델 자동 추천
- **리스크 분석**: 프로젝트 리스크 점수 계산 + 원인/해결책 제시
- **태스크 분해**: Plan을 AgentTask 단위로 자동 분해

### ✅ Active Task
현재 진행 중인 작업의 상세 관리 — AI Automation Hub.

### 📝 Log
전체 이벤트 로그 조회 + 필터링.

### 📅 Timeline
주간 캘린더 기반 시각화.

### ⚙️ Settings
에디터(Cursor/Claude Code/Codex/Antigravity) 등록, AI 모델별 점수 설정, GitHub 연동 관리.
- **에디터 토글**: 사용 중인 개발 도구 등록
- **모델 점수**: Coding/Analysis/Documentation/Speed 카테고리별 점수 (Radar Chart)
- **GitHub 연동**: OAuth 기반 레포 연결 + 프로젝트 Import

### 🔐 Auth
GitHub OAuth 기반 로그인. AuthGuard로 미인증 사용자 차단.

<br/>

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite 7 · React 19 · TypeScript 5.9 (strict) |
| Styling | Tailwind CSS · shadcn/ui |
| Backend | Supabase (DB · Auth · Realtime) |
| AI | Gemini API (모델 추천 · 분석) |
| Deploy | Vercel · PWA |

<br/>

## Getting Started

```bash
# Install
npm install

# Set environment variables
cp .env.example .env.local

# Run
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (RLS applied) |
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth App client ID |

<br/>

## Architecture

```
src/
├── components/
│   ├── auth/           # Auth (AuthGuard, LoginPage)
│   ├── common/         # Layout (AppLayout, ConfirmDialog, StatusBadge)
│   ├── dashboard/      # Dashboard panels
│   ├── github/         # GitHub (ProjectGitHubPanel)
│   ├── ui/             # shadcn/ui primitives
│   └── views/          # Tab views (6개)
│       ├── ReleasePlanView
│       ├── ActiveTaskView
│       ├── OrchestrationView
│       ├── LogView
│       ├── TimelineView
│       └── SettingsView
├── features/
│   └── orchestration/  # AI 오케스트레이션 엔진
│       ├── advisor.ts        # 모델 추천
│       ├── riskAnalyzer.ts   # 리스크 분석
│       ├── taskDecomposer.ts # 태스크 분해
│       └── taskTypes.ts      # 작업 유형 정의
├── hooks/              # Custom React hooks (15개)
├── lib/
│   ├── supabase/       # Supabase CRUD (12 modules)
│   ├── github/         # GitHub API
│   ├── events/         # Event pipeline
│   ├── domain/         # Work item transitions
│   ├── metrics/        # Metrics computation
│   └── utils/          # Recurrence calculator
└── types/              # TypeScript interfaces
```

<br/>

## Database

| Table | Purpose |
|-------|---------|
| `plans` | Plan system (task · event · fixed · project) |
| `work_items` | Work item state machine (`backlog → candidate → active → done \| blocked`) |
| `event_logs` | Event pipeline + agent activity logs |
| `session_logs` | Agent session tracking |
| `github_connections` | GitHub OAuth + repo mapping |
| `agent_connections` | AI agent registration + status tracking |
| `agent_tasks` | Agent task assignment + execution tracking |
| `run_results` | Agent task execution results |
| `model_scores` | AI model scoring per task type |
| `editor_models` | Editor-supported model mapping |

<br/>

## Design System

보라톤(Violetone) 단일 팔레트 기반 디자인. Main: `#896EA6`

Dark/Light 테마 지원. CSS Variables로 테마 전환 시 컴포넌트 구조 유지.

<br/>

## License

Private
