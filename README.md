# Orchestrator

여러 프로젝트와 외부 앱 흐름을 하나로 연결해, 실행과 계획 관리를 보조하는 개인용 AI 오케스트레이터입니다.

## 개요

- 메인 디바이스: MacBook
- 서브 디바이스: iPhone
- 배포 전략: Web 우선 -> PWA 전환 -> 추후 App Store 확장

핵심 원칙:

- AI 주도가 아니라 사용자 주도
- AI는 정해진 워크플로우 안에서 보조 역할 수행
- 작업 개수 제한 대신 시간 기반 실행 압축 적용

## 핵심 기능

### 실행/계획 관리

- 상태 모델: `backlog -> candidate -> active -> done | blocked | deferred`
- `next_action` 기반 실행 가능 단위 관리
- 일정 충돌 감지 및 재배치 제안
- `done_log` 중심의 회고 데이터 축적

### 코딩 오케스트레이션

- 여러 프로젝트의 진행 상태를 상위 맥락에서 통합 관리
- 실제 코딩 실행은 `antigravity(main)` + `codex(sub)`에서 진행
- 본 앱은 이벤트 기록과 완료/차단 추적에 집중

### 외부 앱 연동 보조

- 앱별 역할에 맞는 사용 가이드/워크플로우 제안
- 반복 작업 효율화 포인트 제시

## AI 운영 규칙

AI는 보조자이며 최종 의사결정 권한은 사용자에게 있습니다.

1. `next_action` 없는 task는 `active`로 올리지 않음
2. 일정 충돌 시 자동 반영하지 않고 제안만 생성
3. `blocked` 발생 시 15~30분 대체 작업 최소 1개 제안
4. `/close` 시 `done_log` 누락이면 완료 처리 거부
5. 리포트 형식은 항상 `원인 -> 제안 -> 예상효과`

## 모델 구성

모델 교체가 가능한 어댑터 구조를 목표로 합니다.

- 초기 우선: Gemini + GPT 계열
- 후보: `gemini flash` 계열, `gpt-codex` 계열
- 라우팅 기준: 속도, 정확도, 문맥 복잡도

## 연동 앱 범위

### Re-mind

- 뉴스 읽기
- 신기술 학습
- 레퍼런스 탐색

### Planfit

- 기록장
- 일기장

### 분리/통합 전략

- 자금관리: "크립토 세무 도구"와 연계 후 추후 통합
- 캘린더: 별도 앱 분리 없이 Orchestrator 화면에 통합

## 운영 워크플로우

### Daily

- 환경 점검(homebrew, 파일, 개발도구 상태)
- `/plan`으로 당일 실행 슬롯 계산
- `focus -> close` 실행 루프
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
- 필요 시 채용 정보 피드 수집/정리
- 신규 약속/긴급 일정 발생 시 재배치 제안

## 명령 인터페이스 (목표)

- `/capture [text]`
- `/clarify [task_id]`
- `/plan [available_time]`
- `/focus [task_id]`
- `/close [task_id]`
- `/review [daily|weekly|monthly]`
- `/reschedule [reason]`

## 데이터 레이어 개요

- Local: 최근 명령 히스토리, draft 입력, 오프라인 큐
- Server: 작업/세션/이벤트/외부 앱 연결 상태
- Shared: 앱 간 공용 메타데이터

## 현재 구현 상태

구현됨:

- Vite + React + TypeScript SPA
- React Router 단일 대시보드 구조
- 라이트/다크 테마 토글
- Supabase 클라이언트 및 타입 정의
- 초기 DB 마이그레이션 (`001_initial_schema.sql`)

진행 중:

- 명령 파서/실행 루프
- 스케줄링 엔진
- 이벤트 로그 기반 리포트
- 외부 앱 연동 자동화
- 코딩 오케스트레이션 이벤트 수집

## 기술 스택

- Vite 7
- React 19
- TypeScript 5.9 (strict)
- React Router v7
- Supabase
- Vanilla CSS + CSS Variables
- npm

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

`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 키이므로 프론트엔드에 두지 않습니다.

### 3) 개발 서버 실행

```bash
npm run dev
```

## 스크립트

- `npm run dev`: 개발 서버 실행
- `npm run build`: 타입체크 + 프로덕션 빌드
- `npm run lint`: ESLint 검사
- `npm run preview`: 빌드 결과 프리뷰

## 데이터베이스

초기 스키마: `supabase/migrations/001_initial_schema.sql`

핵심 테이블:

- `work_items`
- `fixed_events`
- `project_deadlines`
- `session_logs`
- `external_apps`
- `event_logs`

참고:

- 현재 마이그레이션은 RLS 활성화 + 개인용 permissive 정책 포함
- 운영 환경에서는 인증 모델에 맞춰 정책 강화 필요

## 프로젝트 구조

```text
src/
  components/
    common/
    dashboard/
  hooks/
  lib/
    supabase/
  types/
  main.tsx
  router.tsx

supabase/
  migrations/
    001_initial_schema.sql

참조/
  project_start.md
```

## 로드맵

- Phase 1 (v0.1): 단일 메인 화면 + 명령 루프 + 이벤트 로그
- Phase 2 (v0.2): PWA 안정화 + iPhone UI 고도화
- Phase 3 (v0.3): 멀티 모델 라우팅 + 주/월간 리포트 강화
- Phase 4 (v1.0): 외부 앱 확장 + 승인형 자동화 확대
