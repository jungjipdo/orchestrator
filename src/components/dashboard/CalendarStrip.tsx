// ============================================
// CalendarStrip — 오늘 일정 + 임박 마감
// ============================================

import type { FixedEventRow, ProjectDeadlineRow } from '../../types/database'
import { EmptyState } from '../common/EmptyState'

interface CalendarStripProps {
    events: FixedEventRow[]
    deadlines: ProjectDeadlineRow[]
}

function formatClock(iso: string): string {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function computeDday(iso: string): number {
    const today = new Date()
    const target = new Date(iso)
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function CalendarStrip({ events, deadlines }: CalendarStripProps) {
    const visibleEvents = events.slice(0, 4)
    const visibleDeadlines = deadlines.slice(0, 4)

    return (
        <section className="calendar-strip">
            <div className="calendar-strip__head">
                <h3>Calendar + Deadline</h3>
                <span>Hard Event 우선, 충돌은 제안만</span>
            </div>

            <div className="calendar-strip__row">
                <div className="calendar-strip__group">
                    <span className="calendar-strip__label">Today Events</span>
                    {visibleEvents.length === 0 ? (
                        <EmptyState message="등록된 일정 없음" icon="📅" className="calendar-strip__empty" />
                    ) : (
                        <ul className="calendar-strip__chips">
                            {visibleEvents.map((event) => (
                                <li key={event.id} className="calendar-chip">
                                    <strong>{formatClock(event.start_at)}</strong>
                                    <span>{event.title}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="calendar-strip__divider" aria-hidden="true" />

                <div className="calendar-strip__group">
                    <span className="calendar-strip__label">Upcoming Deadlines</span>
                    {visibleDeadlines.length === 0 ? (
                        <EmptyState message="임박 마감 없음" icon="⏳" className="calendar-strip__empty" />
                    ) : (
                        <ul className="calendar-strip__chips">
                            {visibleDeadlines.map((deadline) => {
                                const dday = computeDday(deadline.deadline_at)
                                const urgent = dday <= 2
                                return (
                                    <li key={deadline.id} className={`deadline-chip${urgent ? ' is-urgent' : ''}`}>
                                        <strong>D-{dday}</strong>
                                        <span>{deadline.milestone}</span>
                                        <em>risk {deadline.risk_score}</em>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    )
}
