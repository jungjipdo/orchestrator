// ============================================
// StatusBadge — 작업 상태 배지
// ============================================

import type { WorkItemStatus } from '../../types/index'

interface StatusBadgeProps {
    status: WorkItemStatus
    className?: string
}

const LABEL_MAP: Record<WorkItemStatus, string> = {
    backlog: 'Backlog',
    candidate: 'Candidate',
    active: 'Active',
    done: 'Done',
    blocked: 'Blocked',
    deferred: 'Deferred',
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    return (
        <span className={`status-badge status-badge--${status} ${className}`.trim()}>
            {LABEL_MAP[status]}
        </span>
    )
}
