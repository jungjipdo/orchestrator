// ============================================
// ScheduleSlot — 실행 슬롯 시각화
// ============================================

import type { ScheduleSlot as Slot } from '../../types/index'
import { TimeBlock } from '../common/TimeBlock'

interface ScheduleSlotProps {
    slot: Slot
    title: string
}

function toClock(iso: string): string {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export function ScheduleSlot({ slot, title }: ScheduleSlotProps) {
    return (
        <article className="schedule-slot">
            <div className="schedule-slot__time">{toClock(slot.start)} - {toClock(slot.end)}</div>
            <div className="schedule-slot__body">
                <TimeBlock minutes={slot.block_minutes} label={title} />
            </div>
        </article>
    )
}
