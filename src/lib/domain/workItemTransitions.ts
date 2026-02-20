// ============================================
// workItemTransitions.ts — 상태 전이 규칙 정의
// 유효 전이 맵 + 검증 함수
// ============================================

import type { WorkItemStatus } from '../../types/index'

// === 유효 전이 맵 ===

export const VALID_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
    backlog: ['candidate', 'active', 'deferred'],
    candidate: ['active', 'backlog', 'deferred'],
    active: ['done', 'blocked', 'deferred'],
    blocked: ['active', 'deferred'],
    done: ['active'],      // reopen (드물지만 허용)
    deferred: ['backlog', 'candidate'],
}

// === 검증 함수 ===

/**
 * 두 상태 간 전이가 유효한지 확인
 * @returns true면 유효, false면 잘못된 전이
 */
export function isValidTransition(from: WorkItemStatus, to: WorkItemStatus): boolean {
    if (from === to) return true  // 동일 상태는 no-op
    return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * 전이 시도 시 에러 메시지 (유효하면 null)
 */
export function getTransitionError(from: WorkItemStatus, to: WorkItemStatus): string | null {
    if (isValidTransition(from, to)) return null
    const allowed = VALID_TRANSITIONS[from]?.join(', ') ?? '없음'
    return `"${from}" → "${to}" 전이는 허용되지 않습니다. 가능한 전이: ${allowed}`
}

// === 상태 메타데이터 ===

export const STATUS_META: Record<WorkItemStatus, { label: string; emoji: string; color: string }> = {
    backlog: { label: '백로그', emoji: '📥', color: 'text-gray-500' },
    candidate: { label: '후보', emoji: '📋', color: 'text-blue-500' },
    active: { label: '진행 중', emoji: '🔵', color: 'text-green-600' },
    blocked: { label: '차단됨', emoji: '🔴', color: 'text-red-500' },
    done: { label: '완료', emoji: '✅', color: 'text-emerald-600' },
    deferred: { label: '보류', emoji: '⏸️', color: 'text-yellow-500' },
}
