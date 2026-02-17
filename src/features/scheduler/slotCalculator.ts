// ============================================
// slotCalculator.ts — 실행 슬롯 계산
// Hard event 고정 → 빈 시간에 soft task 배치
// ============================================

import type {
    ScheduleInput,
    SchedulePlan,
    ScheduleSlot,
    BlockMinutes,
    FixedEvent,
} from '../../types/index'
import { sortByPriority } from './priorityEngine'

// === 블록 길이 결정 (Contract C6) ===

function pickBlockMinutes(estimateMin: number | null): BlockMinutes {
    if (estimateMin === null) return 50  // 기본값
    if (estimateMin <= 30) return 25
    if (estimateMin <= 60) return 50
    return 90
}

// === 빈 시간대 계산 ===

interface TimeGap {
    start: number  // epoch ms
    end: number    // epoch ms
}

/**
 * 오늘 가용 시간에서 고정 일정을 제외한 빈 시간대 반환
 * 기준일: 오늘 로컬 기준으로 가용 시간 계산
 */
function findGaps(availableMinutes: number, fixedEvents: FixedEvent[]): TimeGap[] {
    const now = new Date()
    const dayStart = now.getTime()
    const dayEnd = dayStart + availableMinutes * 60 * 1000

    // 고정 일정을 시간순 정렬
    const sorted = [...fixedEvents]
        .map(e => ({
            start: new Date(e.start_at).getTime(),
            end: new Date(e.end_at).getTime(),
        }))
        .filter(e => e.end > dayStart && e.start < dayEnd)
        .sort((a, b) => a.start - b.start)

    const gaps: TimeGap[] = []
    let cursor = dayStart

    for (const event of sorted) {
        if (event.start > cursor) {
            gaps.push({ start: cursor, end: event.start })
        }
        cursor = Math.max(cursor, event.end)
    }

    if (cursor < dayEnd) {
        gaps.push({ start: cursor, end: dayEnd })
    }

    return gaps
}

// === 메인 계산 ===

export function calculateSlots(input: ScheduleInput): SchedulePlan {
    const { available_minutes, fixed_events, candidates, deadlines } = input

    // 우선순위 정렬
    const sorted = sortByPriority(candidates, deadlines)

    // 빈 시간대 계산
    const gaps = findGaps(available_minutes, fixed_events)

    const slots: ScheduleSlot[] = []
    let usedMinutes = 0
    let gapIndex = 0
    let gapCursor = gaps.length > 0 ? gaps[0].start : 0

    for (const item of sorted) {
        if (gapIndex >= gaps.length) break

        const blockMin = pickBlockMinutes(item.estimate_min)
        const blockMs = blockMin * 60 * 1000

        // 현재 gap에 배치 가능한지 확인
        while (gapIndex < gaps.length) {
            const gap = gaps[gapIndex]
            const remainingGap = gap.end - gapCursor

            if (remainingGap >= blockMs) {
                // 배치 가능
                slots.push({
                    work_item_id: item.id,
                    start: new Date(gapCursor).toISOString(),
                    end: new Date(gapCursor + blockMs).toISOString(),
                    block_minutes: blockMin,
                })

                gapCursor += blockMs
                usedMinutes += blockMin
                break
            } else {
                // 다음 gap으로 이동
                gapIndex++
                if (gapIndex < gaps.length) {
                    gapCursor = gaps[gapIndex].start
                }
            }
        }
    }

    return {
        slots,
        available_minutes,
        used_minutes: usedMinutes,
        recommended_active_count: slots.length,
    }
}
