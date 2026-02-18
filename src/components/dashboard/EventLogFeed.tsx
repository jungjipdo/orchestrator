// ============================================
// EventLogFeed — 이벤트 로그 피드 (아이콘+배지)
// ============================================

import type { EventLogRow } from '../../types/database'
import { EmptyState } from '../common/EmptyState'

interface EventLogFeedProps {
    logs: EventLogRow[]
    loading: boolean
    maxItems?: number
}

const EVENT_ICONS: Record<string, string> = {
    'schedule.new': '📋',
    'schedule.conflict': '⚠️',
    'session.start': '▶️',
    'session.end': '⏹️',
    'work_item.created': '📝',
    'work_item.updated': '✏️',
    'work_item.status_changed': '🔄',
    'review.daily': '📊',
}

function getEventIcon(eventType: string): string {
    return EVENT_ICONS[eventType] ?? '📌'
}

function formatClock(iso: string): string {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export function EventLogFeed({ logs, loading, maxItems = 5 }: EventLogFeedProps) {
    if (loading) {
        return <p className="event-log-feed__loading">이벤트 로그 로딩 중...</p>
    }

    if (logs.length === 0) {
        return (
            <EmptyState
                icon="🧾"
                message="이벤트 없음"
                subMessage="/plan, /focus 실행 후 로그 생성"
            />
        )
    }

    return (
        <ul className="event-log-feed">
            {logs.slice(0, maxItems).map((log) => (
                <li key={log.id} className="event-log-feed__item">
                    <span className="event-log-feed__icon">{getEventIcon(log.event_type)}</span>
                    <div className="event-log-feed__content">
                        <strong>{log.event_type}</strong>
                        <span>{formatClock(log.triggered_at)}</span>
                    </div>
                </li>
            ))}
        </ul>
    )
}
