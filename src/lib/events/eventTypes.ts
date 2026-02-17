// ============================================
// eventTypes.ts — 이벤트 유형 상수 + 메타데이터
// ============================================

export const EVENT_TYPES = {
    SCHEDULE_NEW: 'schedule.new',
    SCHEDULE_URGENT: 'schedule.urgent',
    TASK_STATUS_CHANGE: 'task.status_change',
    TASK_BLOCKED: 'task.blocked',
    CODING_MILESTONE_DONE: 'coding.milestone_done',
    REVIEW_DAILY: 'review.daily',
    INFO_COLLECTED: 'info.collected',
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

// === 이벤트 메타데이터 ===

interface EventMeta {
    label: string
    autoApply: boolean  // true: 자동 적용, false: 사용자 확인 필요
}

export const EVENT_META: Record<EventType, EventMeta> = {
    [EVENT_TYPES.SCHEDULE_NEW]: {
        label: '신규 일정 등록',
        autoApply: false,
    },
    [EVENT_TYPES.SCHEDULE_URGENT]: {
        label: '긴급 일정 발생',
        autoApply: false,
    },
    [EVENT_TYPES.TASK_STATUS_CHANGE]: {
        label: '작업 상태 변경',
        autoApply: true,
    },
    [EVENT_TYPES.TASK_BLOCKED]: {
        label: '작업 차단 발생',
        autoApply: false,
    },
    [EVENT_TYPES.CODING_MILESTONE_DONE]: {
        label: '코딩 마일스톤 완료',
        autoApply: true,
    },
    [EVENT_TYPES.REVIEW_DAILY]: {
        label: '일일 리뷰',
        autoApply: false,
    },
    [EVENT_TYPES.INFO_COLLECTED]: {
        label: '정보 수집 완료',
        autoApply: true,
    },
}
