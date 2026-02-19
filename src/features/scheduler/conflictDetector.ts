// ============================================
// conflictDetector.ts — 일정 충돌 감지 (Contract C4)
// [start, end) 반개구간 기준
// 향후 에이전트 Task 스케줄링에서 재활용 가능
// ============================================

import type { FixedEvent } from '../../types/index'

// === 범용 시간 슬롯 (에이전트 작업에도 적용 가능) ===

export interface TimeSlot {
    id: string
    start: string
    end: string
}

// === 충돌 결과 ===

export interface Conflict {
    slotA: TimeSlot
    slotB: TimeSlot
}

// === 충돌 감지 (반개구간 [start, end)) ===

function overlaps(
    startA: string, endA: string,
    startB: string, endB: string,
): boolean {
    const a0 = new Date(startA).getTime()
    const a1 = new Date(endA).getTime()
    const b0 = new Date(startB).getTime()
    const b1 = new Date(endB).getTime()

    // [a0, a1) ∩ [b0, b1) ≠ ∅ ⟺ a0 < b1 && b0 < a1
    return a0 < b1 && b0 < a1
}

/** 고정 일정 간 충돌 감지 */
export function detectEventConflicts(events: FixedEvent[]): Conflict[] {
    const conflicts: Conflict[] = []

    for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
            const a = events[i]
            const b = events[j]

            if (overlaps(a.start_at, a.end_at, b.start_at, b.end_at)) {
                conflicts.push({
                    slotA: { id: a.id, start: a.start_at, end: a.end_at },
                    slotB: { id: b.id, start: b.start_at, end: b.end_at },
                })
            }
        }
    }

    return conflicts
}

/** 범용 시간 슬롯이 고정 일정과 충돌하는지 검사 */
export function detectSlotConflicts(
    slots: TimeSlot[],
    fixedEvents: FixedEvent[],
): Conflict[] {
    const conflicts: Conflict[] = []

    for (const slot of slots) {
        for (const event of fixedEvents) {
            if (overlaps(slot.start, slot.end, event.start_at, event.end_at)) {
                conflicts.push({
                    slotA: { id: slot.id, start: slot.start, end: slot.end },
                    slotB: { id: event.id, start: event.start_at, end: event.end_at },
                })
            }
        }
    }

    return conflicts
}
