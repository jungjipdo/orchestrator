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
    // Phase 2: WorkItem 수명주기 이벤트
    WORK_ITEM_CREATED: 'work_item_created',
    WORK_ITEM_UPDATED: 'work_item_updated',
    WORK_ITEM_STATUS_CHANGED: 'work_item_status_changed',
    WORK_ITEM_DELETED: 'work_item_deleted',
    // Phase 2: 오케스트레이션 이벤트
    ORCHESTRATION_ANALYZED: 'orchestration_analyzed',
    ORCHESTRATION_SAVED: 'orchestration_saved',
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
    // Phase 2: WorkItem 수명주기
    [EVENT_TYPES.WORK_ITEM_CREATED]: {
        label: '작업 생성',
        autoApply: true,
    },
    [EVENT_TYPES.WORK_ITEM_UPDATED]: {
        label: '작업 수정',
        autoApply: true,
    },
    [EVENT_TYPES.WORK_ITEM_STATUS_CHANGED]: {
        label: '작업 상태 전이',
        autoApply: true,
    },
    [EVENT_TYPES.WORK_ITEM_DELETED]: {
        label: '작업 삭제 (soft)',
        autoApply: true,
    },
    // Phase 2: 오케스트레이션
    [EVENT_TYPES.ORCHESTRATION_ANALYZED]: {
        label: 'AI 작업 분석 완료',
        autoApply: true,
    },
    [EVENT_TYPES.ORCHESTRATION_SAVED]: {
        label: '오케스트레이션 저장',
        autoApply: true,
    },
}
