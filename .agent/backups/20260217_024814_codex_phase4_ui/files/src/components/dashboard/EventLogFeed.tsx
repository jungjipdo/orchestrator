// ============================================
// EventLogFeed — 이벤트 로그 피드
// ============================================

import type { EventLogRow } from '../../types/database'
import { EmptyState } from '../common/EmptyState'

interface EventLogFeedProps {
    logs: EventLogRow[]
    loading: boolean
}

function formatClock(iso: string): string {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export function EventLogFeed({ logs, loading }: EventLogFeedProps) {
    if (loading) {
        return <p className="event-log-feed__loading">이벤트 로그를 불러오는 중...</p>
    }

    if (logs.length === 0) {
        return (
            <EmptyState
                icon="🧾"
                message="이벤트가 아직 없습니다"
                subMessage="/plan, /focus, /close 실행 후 로그가 쌓입니다"
            />
        )
    }

    return (
        <ul className="event-log-feed">
            {logs.slice(0, 8).map((log) => (
                <li key={log.id} className="event-log-feed__item">
                    <div className="event-log-feed__meta">
                        <span>{formatClock(log.triggered_at)}</span>
                        <em>{log.actor}</em>
                    </div>
                    <strong>{log.event_type}</strong>
                </li>
            ))}
        </ul>
    )
}
