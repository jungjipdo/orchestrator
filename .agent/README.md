# .agent-template

> 새 프로젝트에 복사해서 사용하는 AI 에이전트 워크플로우 템플릿

## 사용법

```bash
# 새 프로젝트에 복사
cp -r ~/.gemini/.agent-template 프로젝트경로/.agent

# 프로젝트에 맞게 수정
# 1. PROJECT.md - 프로젝트 정보 작성
# 2. CURRENT_SPRINT.md - 현재 작업 작성
# 3. PHASES.md - 개발 프로세스 정의
```

## 파일 구조

```
.agent/
├── PROJECT.md           # 프로젝트 컨텍스트 (기술스택, 컨벤션)
├── CURRENT_SPRINT.md    # 현재 작업 상태 (세션 복구용)
├── PHASES.md            # 개발 프로세스 정의 (설계/구현/테스팅)
└── workflows/
    ├── start.md         # /start - 세션 시작 체크
    ├── verify.md        # /verify - 빌드 & 테스트
    └── pre-commit.md    # /pre-commit - 커밋 전 검증
```

## 워크플로우 명령

| 명령 | 설명 | 자동화 |
|------|------|--------|
| `/start` | 세션 시작 시 상태 확인 | 전체 자동 |
| `/verify` | 빌드 및 테스트 실행 | 전체 자동 |
| `/pre-commit` | 커밋 전 검증 | 일부 자동 |

## // turbo 란?

워크플로우 파일 내 주석:
- `// turbo` - 해당 단계만 자동 실행
- `// turbo-all` - 모든 단계 자동 실행
- (없음) - 사용자 확인 필요

---

## Git Worktree 가이드

### Worktree란?
하나의 Git 저장소에서 **여러 브랜치를 동시에 물리적으로 분리된 폴더**에서 작업할 수 있게 해주는 기능.

### 언제 사용하는가?

| 상황 | Worktree 필요? | 이유 |
|------|:--------------:|------|
| 단일 기능 개발 | ❌ | 오버헤드만 증가 |
| 간단한 버그 수정 | ❌ | 브랜치 전환으로 충분 |
| **Full-Stack 기능 (API + UI 동시)** | ✅ | 파일 충돌 방지 |
| **대규모 리팩토링** | ✅ | 안전한 병렬 작업 |
| **여러 기능 동시 개발** | ✅ | 브랜치 격리 |

### 구체적 사용 시나리오

**예시: 로그인 기능 개발 (백엔드 + 프론트엔드)**

```bash
# 1. 현재 main에서 시작
cd my-project

# 2. 백엔드용 worktree 생성
git worktree add ../my-project-api -b feature/login-api

# 3. 프론트엔드용 worktree 생성
git worktree add ../my-project-ui -b feature/login-ui

# 결과 폴더 구조:
# my-project/          ← main (안정 버전)
# my-project-api/      ← feature/login-api (백엔드 작업)
# my-project-ui/       ← feature/login-ui (프론트엔드 작업)
```

**작업 흐름:**
```bash
# 터미널 1: 백엔드 작업
cd ../my-project-api
# API 코드 작성...

# 터미널 2: 프론트엔드 작업 (동시에!)
cd ../my-project-ui
# UI 코드 작성...
```

**완료 후 병합:**
```bash
# main으로 돌아가서 병합
cd my-project
git merge feature/login-api
git merge feature/login-ui

# worktree 정리
git worktree remove ../my-project-api
git worktree remove ../my-project-ui
```

### 핵심 규칙

1. **같은 파일 동시 수정 금지** - worktree 간에도 충돌 발생
2. **인터페이스 먼저 정의** - 병렬 작업 전 타입/API 확정
3. **의존성 순서로 병합** - 백엔드 먼저 → 프론트엔드
