// ============================================
// priorityEngine.ts — 결정론적 우선순위 계산 (Contract C6)
// 동일 입력 → 동일 출력 보장
// ============================================

import type { WorkItem, ProjectDeadline } from '../../types/index'

// === 가중치 (고정, 추후 설정에서 조정 가능) ===

const WEIGHTS = {
    urgency: 0.4,
    risk: 0.3,
    deadline: 0.3,
} as const

// === 긴급도 계산 ===

/**
 * due_at 임박도를 0~100 점수로 변환
 * - 기한 없음: 0
 * - 이미 지남: 100
 * - 7일 이내: 선형 보간 (0일 남음=100, 7일 남음=0)
 * - 7일 초과: 0
 */
function calculateUrgency(item: WorkItem): number {
    if (!item.due_at) return 0

    const now = Date.now()
    const due = new Date(item.due_at).getTime()
    const daysRemaining = (due - now) / (1000 * 60 * 60 * 24)

    if (daysRemaining <= 0) return 100
    if (daysRemaining >= 7) return 0

    return Math.round((1 - daysRemaining / 7) * 100)
}

// === 리스크 점수 조회 ===

/**
 * work_item의 project_id에 해당하는 deadline 중 최대 risk_score 반환
 */
function getMaxRiskScore(item: WorkItem, deadlines: ProjectDeadline[]): number {
    if (!item.project_id) return 0

    const projectDeadlines = deadlines.filter(d => d.project_id === item.project_id)
    if (projectDeadlines.length === 0) return 0

    return Math.max(...projectDeadlines.map(d => d.risk_score))
}

// === 마감 임박도 계산 ===

/**
 * 프로젝트 마감 중 가장 가까운 것의 임박도 (0~100)
 */
function calculateDeadlineProximity(item: WorkItem, deadlines: ProjectDeadline[]): number {
    if (!item.project_id) return 0

    const projectDeadlines = deadlines.filter(d => d.project_id === item.project_id)
    if (projectDeadlines.length === 0) return 0

    const now = Date.now()
    const closestDays = Math.min(
        ...projectDeadlines.map(d => {
            const remaining = (new Date(d.deadline_at).getTime() - now) / (1000 * 60 * 60 * 24)
            return remaining <= 0 ? 0 : remaining
        })
    )

    if (closestDays <= 0) return 100
    if (closestDays >= 30) return 0

    return Math.round((1 - closestDays / 30) * 100)
}

// === 종합 우선순위 점수 ===

export function calculatePriority(item: WorkItem, deadlines: ProjectDeadline[]): number {
    const urgency = calculateUrgency(item)
    const risk = getMaxRiskScore(item, deadlines)
    const deadlineProximity = calculateDeadlineProximity(item, deadlines)

    return (
        WEIGHTS.urgency * urgency +
        WEIGHTS.risk * risk +
        WEIGHTS.deadline * deadlineProximity
    )
}

// === 정렬 (tie-break 포함) ===

/**
 * 결정론적 정렬: priority DESC → due_at ASC → risk DESC → estimate ASC → created_at ASC
 */
export function sortByPriority(items: WorkItem[], deadlines: ProjectDeadline[]): WorkItem[] {
    const scored = items.map(item => ({
        item,
        priority: calculatePriority(item, deadlines),
        risk: getMaxRiskScore(item, deadlines),
    }))

    scored.sort((a, b) => {
        // 1. priority 높은 순
        if (a.priority !== b.priority) return b.priority - a.priority

        // 2. due_at ASC (null은 뒤로)
        const dueA = a.item.due_at ? new Date(a.item.due_at).getTime() : Infinity
        const dueB = b.item.due_at ? new Date(b.item.due_at).getTime() : Infinity
        if (dueA !== dueB) return dueA - dueB

        // 3. risk DESC
        if (a.risk !== b.risk) return b.risk - a.risk

        // 4. estimate ASC (null은 뒤로)
        const estA = a.item.estimate_min ?? Infinity
        const estB = b.item.estimate_min ?? Infinity
        if (estA !== estB) return estA - estB

        // 5. created_at ASC
        return new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime()
    })

    return scored.map(s => s.item)
}
