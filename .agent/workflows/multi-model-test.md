---
description: Multi-model parallel testing workflow
---

# 멀티모델 병렬 테스팅 워크플로우

> 여러 AI 모델을 활용하여 코드 검증의 blind spot을 제거하는 테스팅 프로세스

## 개요

```
┌─────────────────────────────────────────────────────────┐
│                    1. 테스트 요청서 작성                 │
│                    (Antigravity가 생성)                 │
└─────────────────────┬───────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
┌────────┐      ┌────────┐        ┌────────┐
│ Opus   │      │ Sonnet │        │ Codex  │
│ 세션   │      │ 세션   │        │ (CLI)  │
└───┬────┘      └───┬────┘        └───┬────┘
    │               │                 │
    ▼               ▼                 ▼
┌────────┐      ┌────────┐        ┌────────┐
│result- │      │result- │        │result- │
│opus.md │      │sonnet.md│       │codex.md│
└───┬────┘      └───┬────┘        └───┬────┘
    │               │                 │
    └───────────────┼─────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────┐
│              2. 결과 취합 및 최종 판정                   │
│                  (Antigravity)                          │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: 테스트 요청서 생성

Antigravity에게 다음 명령:

```
다음 파일들을 검증하기 위한 테스트 요청서를 작성해줘:
- [검증 대상 파일 목록]
- [관련 스펙/인터페이스 파일]
```

### 생성될 파일: `.agent/testing/test-request.md`

```markdown
# 테스트 요청서

## 검증 대상
- `src/components/LoginForm.tsx`
- `src/hooks/useAuth.ts`

## 스펙 참조
- `contracts/auth.interface.ts`

## 검증 관점

### 1. 로직 검증 (Opus용)
- 인증 플로우가 스펙을 충족하는가?
- 에러 핸들링이 완전한가?
- 엣지케이스가 처리되는가?

### 2. 보안 검증 (Sonnet용)
- XSS 취약점 존재 여부
- 인증 토큰 처리 안전성
- 입력 값 검증 충분성

### 3. 코드 품질 (Codex용)
- 타입 안전성
- 성능 이슈
- 코드 중복

## 응답 형식
각 모델은 다음 형식으로 `.agent/testing/result-{model}.md`에 작성:
- **Pass/Fail**: 전체 판정
- **Issues**: 발견된 문제 목록
- **Suggestions**: 개선 제안
```

---

## Phase 2: 병렬 실행

### 세션 1: Antigravity (Opus/Sonnet/Gemini)

```
# 새 Antigravity 세션에서:
@[.agent/testing/test-request.md] 를 읽고 "로직 검증" 관점에서 
검증해서 .agent/testing/result-opus.md 에 결과 작성해줘
```

### 세션 2: Antigravity (다른 모델)

```
# 모델 변경 후 새 세션:
@[.agent/testing/test-request.md] 를 읽고 "보안 검증" 관점에서 
검증해서 .agent/testing/result-sonnet.md 에 결과 작성해줘
```

### 터미널: Codex CLI

```bash
# terminal에서:
codex "Read .agent/testing/test-request.md and validate 
from 'Code Quality' perspective. 
Write results to .agent/testing/result-codex.md"
```

---

## Phase 3: 결과 취합

// turbo-all

1. 결과 파일 확인
   `ls .agent/testing/result-*.md`

2. 결과 읽기
   `cat .agent/testing/result-opus.md`

3. 결과 읽기
   `cat .agent/testing/result-sonnet.md`

4. 결과 읽기
   `cat .agent/testing/result-codex.md`

---

## Phase 4: 최종 판정

Antigravity에게 요청:

```
@[.agent/testing/result-opus.md] 
@[.agent/testing/result-sonnet.md] 
@[.agent/testing/result-codex.md] 

위 세 검증 결과를 종합해서:
1. 공통으로 지적된 이슈
2. 각 모델만 발견한 이슈
3. 최종 Pass/Fail 판정
4. 수정 우선순위

를 정리해서 .agent/testing/final-verdict.md 에 작성해줘
```

---

## 파일 구조

```
.agent/
└── testing/
    ├── test-request.md      # 테스트 요청서 (Phase 1)
    ├── result-opus.md       # Opus 결과 (Phase 2)
    ├── result-sonnet.md     # Sonnet 결과 (Phase 2)
    ├── result-codex.md      # Codex 결과 (Phase 2)
    └── final-verdict.md     # 최종 판정 (Phase 4)
```

---

## 팁

- **관점 분리**: 각 모델에게 다른 관점 부여 (로직/보안/품질)
- **동일 프롬프트 사용X**: blind spot이 겹침
- **결과 비교**: 2개 이상 모델이 동일 이슈 지적 시 우선 수정
- **시간 절약**: Phase 2는 터미널 탭 여러개로 동시 실행
