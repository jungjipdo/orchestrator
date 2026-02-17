# PROJECT CONTEXT

> "여러 프로젝트와 외부 앱 흐름을 하나의 워크플로우로 관리하고, AI가 고정된 규칙 안에서 실행을 보조하는 개인 컨트롤 타워"

- 메인 디바이스: MacBook / 서브: iPhone
- 배포 방식: Web → PWA → (추후) App Store

## Tech Stack
- **Framework**: Vite 7 + React 19 (SPA)
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: Vanilla CSS + CSS Variables (보라톤 디자인 토큰)
- **Database**: Supabase (DB + Auth + Realtime)
- **AI**: Gemini API + Codex Bridge (LLMAdapter 패턴)
- **Router**: React Router v7
- **Package Manager**: npm

## Architecture
- Pattern: Feature-based modular + Event-driven workflow
- 이벤트 파이프라인: `trigger → classify → propose/auto → user confirm(optional) → apply → log`
- AI 역할: 룰 기반 보조자 (의사결정 권한은 사용자)

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

### 실행 슬롯 계산
- 입력: 오늘 가용 시간(분), 고정 일정 점유 시간(분), 긴급도/기한/예상 소요
- 출력: 권장 active 작업 수, 실행 순서, 블록 길이(25/50/90분)

### 코딩 오케스트레이션

> 본 앱은 코딩을 직접 수행하지 않음. **상위 맥락에서 통합 관리**에 집중.

| 역할 | 담당 |
|------|------|
| 코딩 계획 수립 + 실행 | Antigravity(main) + Codex(sub) |
| 프로젝트 간 진행 상태 관리 | **Orchestrator** |
| 완료/차단 이벤트 기록 | **Orchestrator** |
| 마일스톤 리스크 추적 | **Orchestrator** |

- 이벤트 수집: 각 프로젝트에서 발생한 완료/차단/지연 이벤트를 `event_logs`에 기록
- 추후 확장: Claude Code 등 다른 코딩 도구 연동 가능

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
| 10 (최밝음) | `#FFFFFF` | Light BG /

### CSS Variables — Light Theme

```css
:root[data-theme="light"] {
  --bg: #FFFFFF;
  --surface: #CCC0D8;
  --surface-2: #B2A0C5;
  --text-primary: #33273F;
  --text-secondary: #4C3A5F;
  --accent: #896EA6;
  --accent-strong: #7E619E;
  --border: #B2A0C5;
}
```

### CSS Variables — Dark Theme

```css
:root[data-theme="dark"] {
  --bg: #000000;
  --surface: #191320;
  --surface-2: #33273F;
  --text-primary: #E5DFEC;
  --text-secondary: #CCC0D8;
  --accent: #896EA6;
  --accent-strong: #9881B1;
  --border: #4C3A5F;
}
```

### UI 원칙
- 같은 색상군의 톤만 사용 (외부 색상 금지)
- 테마 전환 시 컴포넌트 구조 유지, CSS Variables만 교체
- 강조: `--accent`, 경고: `--accent-strong` + 아이콘 조합

---

## AI 비서 설계

### 명령 인터페이스

| 명령 | 설명 |
|------|------|
| `/capture [text]` | 작업 빠른 수집 |
| `/clarify [task_id]` | 작업 구조화 (next_action, estimate, DoD) |
| `/plan [available_time]` | 일정 편성 (고정 일정 + 마감 반영) |
| `/focus [task_id]` | 작업 시작 (세션 로그 생성) |
| `/close [task_id]` | 작업 종료 (done_log 필수) |
| `/review [daily\|weekly\|monthly]` | 회고 리포트 |
| `/reschedule [reason]` | 일정 재배치 |

### AI 의사결정 규칙 (필수)
1. `next_action` 없는 task는 `active`로 올리지 않는다
2. 일정 충돌 감지 시 자동 변경하지 않고 **"제안"만** 생성
3. `blocked` 발생 시 대체 15~30분 작업을 1개 이상 제안
4. `/close` 실행 시 `done_log` 누락이면 완료를 거부
5. 리포트는 항상 `원인 → 제안 → 예상효과` 형태

### AI 제안 출력 규격
- 옵션 A/B/C 형태 제시
- 각 옵션: 시간 비용, 리스크, 기대효과 표시
- 마지막 줄에 "권장안" 명시

---

## LLM 어댑터

```ts
interface LLMAdapter {
  provider: "gemini_api" | "codex_bridge" | "openai_api";
  run(command: string, payload: unknown): Promise<LLMResult>;
}
```

### 라우팅 정책
| 유형 | 모델 | 이유 |
|------|------|------|
| 빠른 분류/요약 | `gemini_api` | 속도 |
| 복잡한 구조화/코딩 문맥 | `codex_bridge` | 정확도 |
| 실패 시 | 대체 모델 재시도 → 로컬 룰 템플릿 fallback | 안정성 |

---

## Database (Supabase — 공유 프로젝트)

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
| `fixed_events` | 고정 일정 (Hard Event) |
| `project_deadlines` | 프로젝트 마감 + 리스크 점수 |
| `session_logs` | 작업 세션 기록 (focus→close) |
| `external_apps` | 외부 앱 연동 정보 |
| `event_logs` | 이벤트 파이프라인 로그 |

### 마이그레이션 관리
- 경로: `supabase/migrations/NNN_description.sql`
- 번호 체계: `001`, `002`, ... 순차 증가
- Supabase SQL Editor에서 직접 실행

---

## 앱 생태계 연동

| 앱 | 역할 |
|----|------|
| **Re-mind** | 뉴스 읽기, 신기술 학습, 레퍼런스 탐색 |
| **Planfit** | 기록장, 일기장 |
| **자금관리** | 크립토 세무 도구로 분리 → 상태/이벤트만 반영 |
| **캘린더** | 별도 앱 분리 X → Orchestrator 화면에 통합 표시 |

### 외부 앱 사용 보조
- 앱별 역할에 맞는 **사용 가이드/워크플로우 제안** 제공
- 반복 작업의 **효율화 포인트** 식별 + 제시
- 앱 사용법 학습 데이터를 AI 비서가 참조하여 맥락 기반 보조

### 자동화 정책
| 자동 허용 | 승인 필요 |
|-----------|----------|
| 읽기 전용 동기화 | 일정 변경 |
| 메타데이터 갱신 | task 상태 강제 변경 |
| 리포트 생성 | 외부 앱 쓰기 동작 |

---

## 운영 워크플로우

### Daily
- 환경 점검 (homebrew, 파일, 개발도구 상태)
- `/plan`으로 당일 실행 슬롯 계산
- `focus → close` 실행 루프 반복
- 로그/성과 기록

### Weekly
- 주간 목표/마일스톤 재정렬
- 프로젝트별 진행률과 차단 요인 점검
- 다음 주 우선순위 확정

### Monthly
- 월간 성과/패턴 분석
- 반복 지연 원인 파악
- 운영 규칙 개선안 반영

### 상시 이벤트
- Re-mind 기반 정보 수집/필터링
- 채용 정보 피드 수집/정리 (필요 시)
- 신규 약속/긴급 일정 발생 시 재배치 제안

### 이벤트 유형 정의
| 이벤트 | 트리거 | 자동/제안 |
|--------|--------|----------|
| `schedule.new` | 신규 일정 등록 | 충돌 감지 → 제안 |
| `schedule.urgent` | 긴급 일정 발생 | 재배치 제안 |
| `task.status_change` | 상태 전이 | 자동 기록 |
| `task.blocked` | blocked 발생 | 대체 작업 제안 |
| `coding.milestone_done` | 코딩 마일스톤 완료 | 자동 기록 |
| `review.daily` | 하루 종료 | 리포트 생성 제안 |
| `info.collected` | Re-mind 수집 완료 | 알림 |

---

## 데이터 레이어 전략

| 계층 | 저장소 | 내용 |
|------|--------|------|
| **Local** | localStorage / IndexedDB | 최근 명령 히스토리, draft 입력, 오프라인 큐 |
| **Server** | Supabase | 작업/세션/이벤트/외부 앱 연결 상태 |
| **Shared** | Supabase (공유 테이블) | 앱 간 공용 메타데이터 (사용자 프로필 등) |

### 패턴 분석/피드백
- `session_logs` + `event_logs` 기반으로 실행 패턴 분석
- Daily/Weekly/Monthly 주기로 자동 피드백 리포트 생성
- 반복 지연/차단 패턴 → 운영 규칙 개선안 제시

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
│   ├── common/        # 공통 위젯
│   ├── dashboard/     # 대시보드 관련
│   └── command/       # 명령 인터페이스
├── features/          # 비즈니스 로직 모듈
│   ├── scheduler/     # 스케줄링 엔진
│   ├── workflow/      # 워크플로우 관리
│   ├── llm/           # LLM 어댑터 (Gemini/Codex)
│   └── integration/   # 외부 앱 연동
├── hooks/             # 커스텀 React hooks
├── lib/               # 공유 유틸리티
│   ├── supabase/      # Supabase 클라이언트
│   └── events/        # 이벤트 파이프라인
├── types/             # TypeScript 인터페이스
├── styles/            # 글로벌 스타일 + 디자인 토큰
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
- (초기 설정 단계 — 아직 없음)

---
*This file is referenced by the agent at session start.*
*Commands section is linked to `/verify` workflow.*
*상세 스펙 원본: `참조/project_start.md`*
