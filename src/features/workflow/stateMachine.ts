// ============================================
// stateMachine.ts — 순수 상태 전이 검증 (Contract C1)
// DB I/O 금지. 입력 → 검증 → 결과 반환만.
// ============================================

import type { WorkItemStatus, ErrorCode } from '../../types/index'

// === 전이 규칙 ===

export const VALID_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
    backlog: ['candidate', 'deferred'],
    candidate: ['active', 'backlog', 'deferred'],
    active: ['done', 'blocked', 'deferred'],
    done: [],                    // 완료 후 재오픈은 별도 로직 필요
    blocked: ['active', 'deferred', 'backlog'],
    deferred: ['backlog', 'candidate'],
}

// === 전이 컨텍스트 ===

export interface TransitionContext {
    next_action?: string | null
    done_log?: string | null
}

// === 전이 검증 결과 ===

export interface TransitionResult {
    ok: boolean
    errorCode: ErrorCode | null
}

// === 순수 검증 함수 ===

export function validateTransition(
    current: WorkItemStatus,
    target: WorkItemStatus,
    context: TransitionContext = {},
): TransitionResult {
    // 1. 전이 경로 유효성
    const allowed = VALID_TRANSITIONS[current]
    if (!allowed.includes(target)) {
        return { ok: false, errorCode: 'INVALID_TRANSITION' }
    }

    // 2. active 전이 시 next_action 필수
    if (target === 'active' && !context.next_action) {
        return { ok: false, errorCode: 'MISSING_NEXT_ACTION' }
    }

    // 3. done 전이 시 done_log 필수
    if (target === 'done' && !context.done_log) {
        return { ok: false, errorCode: 'MISSING_DONE_LOG' }
    }

    return { ok: true, errorCode: null }
}

// === 에러 메시지 매핑 ===

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
    MISSING_NEXT_ACTION: 'next_action이 설정되지 않은 작업은 active로 전이할 수 없습니다.',
    MISSING_DONE_LOG: 'done_log가 없으면 작업을 완료할 수 없습니다.',
    INVALID_TRANSITION: '허용되지 않은 상태 전이입니다.',
    NO_ACTIVE_SESSION: '활성 세션이 없습니다.',
    ACTIVE_SESSION_EXISTS: '이미 진행 중인 세션이 있습니다.',
    SCHEDULE_CONFLICT: '일정 충돌이 감지되었습니다.',
}
