# PROJECT CONTEXT

> "AI 에이전트들이 날뛸 수 있는 몸통을 만들어주는 멀티-에이전트 컨트롤 타워"
> — 작업 관리에 특화된 AI 오케스트레이션 SaaS

- 타겟: Vibe Coder / 1인 개발자 → 소규모 팀
- 핵심 차별점: AI 에이전트 작업의 **시각화** + **세션 관리 위탁**
- 배포 방식: Web → PWA → (추후) App Store
- 참고 모델: OpenClaw (멀티 에이전트 연결) — 단, 작업 관리 + 시각화에 특화

## Tech Stack
- **Framework**: Vite 7 + React 19 (SPA)
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui (CSS Variables 기반)
- **Database**: Supabase (DB + Auth + Realtime)
- **AI**: Gemini API + Codex Bridge (LLMAdapter 패턴)
- **Router**: SPA 내부 상태 기반 (activeTab state)
- **Package Manager**: npm

## Architecture
- Pattern: Feature-based modular + Event-driven workflow
- 이벤트 파이프라인: `trigger → classify → propose/auto → user confirm(optional) → apply → log`
- AI 역할: **에이전트 오케스트레이터** — 사용자의 AI 에이전트들을 연결하고 작업 흐름을 관리

### 제품 포지셔닝

```
[기존 PM 도구]  → Notion, Linear, Jira (인간 중심 작업 관리)
[기존 AI 도구]  → OpenClaw, Zapier AI (에이전트 연결, 시각화 부족)
[우리 제품]     → AI 에이전트 작업의 시각화 + 세션 관리 (빈 시장)
```

### 핵심 가치 제안
1. **에이전트가 날뛸 수 있는 몸통**: AI API들을 연결해서 작업할 수 있는 환경 제공
2. **시각화 차별점**: 다른 도구들이 따라올 수 없는 작업 흐름 시각화
3. **세션 관리 위탁**: 에이전트의 작업 세션을 우리가 관리 → 전환 비용 + 데이터 락인

### 상태 모델

```
backlog → candidate → active → done | blocked | deferred
```

| 상태 | 설명 |
|------|------|
| `backlog` | 수집된 전체 작업 |
| `candidate` | 이번 주/오늘 후보 |
| `active` | 현재 실행 창에 올라온 작업 |
| `done` | 완료 |
| `blocked` | 외부 요인으로 막힘 |
| `deferred` | 기한/우선순위 조정으로 뒤로 미룸 |

### 에이전트 오케스트레이션

> 본 앱은 코딩을 직접 수행하지 않음. **에이전트 연결 + 작업 시각화 + 세션 관리**에 집중.

| 역할 | 담당 |
|------|------|
| 코딩 실행 | 사용자의 AI 에이전트들 (Cursor, Codex, Claude Code 등) |
| 에이전트 연결 관리 | **Orchestrator** |
| 작업 흐름 시각화 | **Orchestrator** |
| 세션/진행 상태 추적 | **Orchestrator** |
| 완료/차단 이벤트 기록 | **Orchestrator** |

---

## Design System (보라톤 단일 팔레트)

### 메인 컬러 및 톤 스케일

Main: `#896EA6`

| Index | Hex | 용도 |
|-------|-----|------|
| 0 (최어둠) | `#000000` | Dark BG |
| 1 | `#191320` | Dark Surface |
| 2 | `#33273F` | Dark Surface-2 / Light Text-Primary |
| 3 | `#4C3A5F` | Dark Border / Light Text-Secondary |
| 4 | `#654E7E` | — |
| 5 (메인) | `#896EA6` | Accent (공통) |
| 6 | `#7E619E` | Light Accent-Strong |
| 7 | `#9881B1` | Dark Accent-Strong |
| 8 | `#B2A0C5` | Light Surface-2 / Light Border |
| 9 | `#CCC0D8` | Light Surface / Dark Text-Secondary |
| 10 (최밝음) | `#FFFFFF` | Light BG |

### UI 원칙
- 같은 색상군의 톤만 사용 (외부 색상 금지)
- 테마 전환 시 컴포넌트 구조 유지, CSS Variables만 교체
- 강조: `--accent`, 경고: `--accent-strong` + 아이콘 조합
- **시각화 품질이 제품의 핵심 경쟁력** — 작업 흐름의 시각적 표현에 투자

---

## AI 에이전트 시스템

### 에이전트 연결 (Agent Connection)

사용자가 자신의 AI 에이전트를 등록하고 관리하는 시스템:

```ts
interface AgentConnection {
  name: string              // "Cursor", "Claude Code", "Codex"
  agent_type: AgentType     // 'cursor' | 'claude_code' | 'codex' | 'windsurf' | 'custom'
  project_id: string        // 어떤 프로젝트에 연결?
  status: 'connected' | 'disconnected' | 'error'
  last_sync_at: string
  config: Record<string, unknown>
}
```

### 에이전트 활동 추적

기존 `EventLog` 구조를 활용한 에이전트 활동 피드:
- `event_type`: `'agent.task_started'`, `'agent.commit_pushed'`, `'agent.error'`
- `actor`: `'ai'`일 때 어떤 에이전트인지 `payload`에 기록
- `payload`: `{ agent: 'cursor', project: 'orchestrator', details: '...' }`

### AI 의사결정 규칙
1. 에이전트 상태 변경 시 자동 반영하지 않고 **제안만** 생성
2. `blocked` 발생 시 대체 작업 제안
3. 에이전트 간 작업 충돌 감지 → 알림
4. 리포트 형식: `원인 → 제안 → 예상효과`

### LLM 어댑터

```ts
interface LLMAdapter {
  provider: "gemini_api" | "codex_bridge" | "openai_api";
  run(command: string, payload: unknown): Promise<LLMResult>;
}
```

| 유형 | 모델 | 이유 |
|------|------|------|
| 빠른 분류/요약 | `gemini_api` | 속도 |
| 복잡한 구조화/코딩 문맥 | `codex_bridge` | 정확도 |
| 실패 시 | 대체 모델 재시도 → 로컬 룰 템플릿 fallback | 안정성 |

---

## Database (Supabase)

> ⚠️ **Planfit(calendar)과 동일한 Supabase 프로젝트를 공유**합니다.
> 테이블 이름 충돌에 주의하세요.

### 환경변수
| 변수 | 용도 | 사용 위치 |
|------|------|----------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | 프론트엔드 (클라이언트) |
| `VITE_SUPABASE_ANON_KEY` | 공개 anon key (RLS 적용) | 프론트엔드 (클라이언트) |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회 키 (서버 전용) | Edge Functions / 서버 측만 |

### 기존 테이블 (Planfit — 터치 금지)
`categories`, `events`, `event_notifications`, `journal_pages`,
`journal_settings`, `notification_settings`, `official_event_templates`,
`shared_pages`, `today_plans`, `transaction_meta`, `user_profiles`,
`user_template_subscriptions`, `user_wallets`, `user_websites`,
`users`, `website_whitelist`

### Orchestrator 테이블
| 테이블 | 설명 |
|--------|------|
| `work_items` | 작업 (상태: backlog→candidate→active→done/blocked/deferred) |
| `plans` | Plan 시스템 (task/event/fixed/project) |
| `fixed_events` | 고정 일정 (Hard Event) |
| `project_deadlines` | 프로젝트 마감 + 리스크 점수 |
| `session_logs` | 에이전트 작업 세션 기록 |
| `event_logs` | 이벤트 파이프라인 로그 (에이전트 활동 포함) |

### 구현 완료
- GitHub OAuth 기반 인증 (AuthGuard + LoginPage)
- `agent_connections` 테이블 + CRUD
- `model_scores`, `editor_models` 테이블

### 마이그레이션 관리
- 경로: `supabase/migrations/NNN_description.sql`
- 번호 체계: `001`, `002`, ... 순차 증가
- Supabase SQL Editor에서 직접 실행

---

## 데이터 레이어 전략

| 계층 | 저장소 | 내용 |
|------|--------|------|
| **Local** | localStorage / IndexedDB | draft 입력, 오프라인 큐 |
| **Server** | Supabase | 작업/세션/이벤트/에이전트 연결 상태 |
| **Shared** | Supabase (공유 테이블) | 앱 간 공용 메타데이터 (사용자 프로필 등) |

---

## Conventions

### File Naming
- Components: PascalCase.tsx
- Utilities: camelCase.ts
- Constants: UPPER_SNAKE_CASE.ts
- Hooks: useXxx.ts

### Folder Structure
```
src/
├── components/        # UI 컴포넌트
│   ├── auth/          # 인증 (AuthGuard, LoginPage)
│   ├── common/        # 공통 위젯 (AppLayout, ConfirmDialog)
│   ├── dashboard/     # 대시보드 패널
│   ├── github/        # GitHub 연동 (ProjectGitHubPanel)
│   ├── ui/            # shadcn/ui 컴포넌트
│   └── views/         # 탭 뷰 (6개)
├── features/          # 비즈니스 로직 모듈
│   └── orchestration/ # 오케스트레이션 엔진 (advisor, riskAnalyzer, taskDecomposer)
├── hooks/             # 커스텀 React hooks
├── lib/               # 공유 유틸리티
│   ├── supabase/      # Supabase CRUD
│   ├── github/        # GitHub API
│   ├── events/        # 이벤트 파이프라인
│   ├── domain/        # 도메인 로직
│   ├── metrics/       # 메트릭 계산
│   └── utils/         # 범용 유틸리티
├── types/             # TypeScript 인터페이스
└── App.tsx            # 루트 컴포넌트
```

## Commands

| Purpose | Command | What it does |
|---------|---------|--------------|
| Dev | `npm run dev` | Vite dev server (HMR) |
| Build | `npm run build` | Production build (tsc + vite build) |
| Lint | `npm run lint` | ESLint |
| Preview | `npm run preview` | 빌드 프리뷰 |
| Type Check | `npx tsc --noEmit` | TypeScript 타입 체크 |

### Testing Strategy

```
[Type Check]     → tsc --noEmit
       ↓
[Lint]           → ESLint
       ↓
[Build]          → vite build
```

## Git Strategy
- **main 브랜치만 사용** (빠른 개발 우선)
- Conventional Commits 준수
- 의미 있는 단위로 커밋/푸시

## Known Issues
- (없음)

---
*This file is referenced by the agent at session start.*
*Commands section is linked to `/verify` workflow.*
