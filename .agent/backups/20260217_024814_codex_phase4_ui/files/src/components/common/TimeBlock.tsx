// ============================================
// TimeBlock — 시간 블록 표시 (25/50/90)
// ============================================

import type { BlockMinutes } from '../../types/index'

interface TimeBlockProps {
    minutes: BlockMinutes
    label?: string
    className?: string
}

export function TimeBlock({ minutes, label, className = '' }: TimeBlockProps) {
    return (
        <div className={`time-block time-block--${minutes} ${className}`.trim()}>
            <span className="time-block__minutes">{minutes}m</span>
            {label ? <span className="time-block__label">{label}</span> : null}
        </div>
    )
}
