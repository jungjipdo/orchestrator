# Orchestrator

**Multi-Agent Control Tower** — AI 코딩 에이전트들의 작업 흐름을 하나의 대시보드에서 시각화하고 관리합니다.

<br/>

## Problem

AI 코딩 도구(Cursor, Claude Code, Codex, Windsurf)가 폭발적으로 늘고 있지만, 이 에이전트들의 **작업을 통합 관리하는 도구는 없습니다.**

- 기존 PM 도구(Notion, Linear)는 AI 에이전트를 이해하지 못합니다
- 에이전트 허브(OpenClaw 등)는 작업 시각화가 부족합니다
- 팀 단위 AI 워크플로우를 조율하는 레이어가 빠져 있습니다

<br/>

## Solution

Orchestrator는 **에이전트 연결 + 작업 시각화 + 세션 관리**를 하나로 합칩니다.

| 기능 | 설명 |
|------|------|
| 🤖 **멀티-에이전트 연결** | Cursor, Codex, Claude Code 등을 등록하고 상태를 실시간 추적 |
| 📊 **작업 흐름 시각화** | 프로젝트별 진행 상태, 에이전트 활동 타임라인, 작업 충돌 감지 |
| 🎯 **세션 관리** | 에이전트 작업 세션 기록, 완료/차단/지연 이벤트 로깅 |
| 🔗 **GitHub 연동** | OAuth 기반 레포 연결, Commit/PR 진행 상황 자동 수집 |
| 📋 **Release Plan** | Plan/Project 기반 작업 분해, 서브태스크 관리, 상태 추적 |

<br/>

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite 7 · React 19 · TypeScript 5.9 (strict) |
| Styling | Tailwind CSS · shadcn/ui |
| Backend | Supabase (DB · Auth · Realtime) |
| AI | Gemini API · Codex Bridge (LLMAdapter pattern) |
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
│   ├── auth/           # Authentication
│   ├── common/         # Layout & shared widgets
│   ├── dashboard/      # Dashboard panels
│   ├── github/         # GitHub integration
│   ├── ui/             # shadcn/ui primitives
│   └── views/          # Tab views
│       ├── ReleasePlanView
│       ├── ActiveTaskView
│       ├── OrchestrationView
│       ├── LogView
│       ├── TimelineView
│       └── SettingsView
├── features/           # Business logic
│   ├── llm/            # LLM adapters
│   └── integration/    # Agent orchestration
├── hooks/              # Custom React hooks
├── lib/                # Supabase · GitHub API · Utils
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
| `model_scores` | AI model scoring per task type |

<br/>

## License

Private
