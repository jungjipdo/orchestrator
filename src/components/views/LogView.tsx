// ============================================
// LogView — Event Log (이벤트 로그 뷰 확장)
// 전체 이벤트 목록 + 필터링 (type / actor)
// ============================================

import { useMemo, useState } from 'react'
import { useEventLogs } from '../../hooks/useEventLogs'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
    ScrollText,
    Filter,
    User,
    Bot,
    Cpu,
    Clock,
    CheckCircle,
    AlertTriangle,
    Zap,
    RefreshCw,
} from 'lucide-react'

// ─── Helpers ───
function getActorIcon(actor: string) {
    switch (actor) {
        case 'user': return <User className="w-4 h-4 text-blue-500" />
        case 'ai': return <Bot className="w-4 h-4 text-purple-500" />
        case 'system': return <Cpu className="w-4 h-4 text-gray-500" />
        default: return <Zap className="w-4 h-4 text-muted-foreground" />
    }
}

function getActorColor(actor: string) {
    switch (actor) {
        case 'user': return 'bg-blue-100 text-blue-700'
        case 'ai': return 'bg-purple-100 text-purple-700'
        case 'system': return 'bg-gray-100 text-gray-700'
        default: return 'bg-muted text-muted-foreground'
    }
}

function getEventTypeIcon(eventType: string) {
    if (eventType.includes('error') || eventType.includes('fail')) {
        return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
    if (eventType.includes('done') || eventType.includes('complete') || eventType.includes('success')) {
        return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    if (eventType.includes('start') || eventType.includes('trigger')) {
        return <Zap className="w-4 h-4 text-blue-500" />
    }
    return <Clock className="w-4 h-4 text-muted-foreground" />
}

function formatTimestamp(isoString: string): string {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    if (diffDay < 7) return `${diffDay}일 전`
    return date.toLocaleDateString('ko-KR')
}

const EVENT_TYPE_LABELS: Record<string, string> = {
    'plan.created': '📝 Plan 생성',
    'plan.updated': '✏️ Plan 수정',
    'plan.deleted': '🗑️ Plan 삭제',
    'project.created': '📦 Project 생성',
    'project.updated': '✏️ Project 수정',
    'project.deleted': '🗑️ Project 삭제',
    'schedule.new': '📅 스케줄 생성',
    'session.start': '▶️ 세션 시작',
    'session.end': '⏹️ 세션 종료',
    'work_item.created': '📋 작업 생성',
    'work_item.updated': '✏️ 작업 수정',
}

function formatEventType(eventType: string): string {
    return EVENT_TYPE_LABELS[eventType] ?? eventType.replace(/_/g, ' ')
}

export function LogView() {
    // 7일 전 날짜 계산
    const since7d = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString()
    }, [])

    const { logs, loading, refresh } = useEventLogs({ since: since7d })
    const [filterActor, setFilterActor] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<string | null>(null)

    // ─── 고유 값 추출 ───
    const uniqueActors = useMemo(() => {
        const actors = new Set(logs.map(l => l.actor))
        return Array.from(actors)
    }, [logs])

    // ─── 필터링 ───
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (filterActor && log.actor !== filterActor) return false
            if (filterType && log.event_type !== filterType) return false
            return true
        })
    }, [logs, filterActor, filterType])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-muted rounded animate-pulse w-48" />
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold">Activity Log</h2>
                    <p className="text-muted-foreground">최근 7일간 Plans, Projects 생성·수정·삭제 등 전체 활동 기록</p>
                </div>
                <Button variant="outline" onClick={() => void refresh()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 mr-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filter:</span>
                </div>

                {/* Actor filter */}
                <Button
                    size="sm"
                    variant={filterActor === null ? 'default' : 'outline'}
                    onClick={() => setFilterActor(null)}
                >
                    All Actors
                </Button>
                {uniqueActors.map(actor => (
                    <Button
                        key={actor}
                        size="sm"
                        variant={filterActor === actor ? 'default' : 'outline'}
                        onClick={() => setFilterActor(actor === filterActor ? null : actor)}
                    >
                        {getActorIcon(actor)}
                        <span className="ml-1 capitalize">{actor}</span>
                    </Button>
                ))}

                <div className="w-px bg-border mx-2" />

                {/* Type filter */}
                {filterType && (
                    <Button size="sm" variant="outline" onClick={() => setFilterType(null)}>
                        ✕ {filterType}
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Total Events</CardTitle>
                        <ScrollText className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{logs.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {filteredLogs.length} shown
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">AI Events</CardTitle>
                        <Bot className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs.filter(l => l.actor === 'ai').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Automated actions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">User Events</CardTitle>
                        <User className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs.filter(l => l.actor === 'user').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Manual actions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Event List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ScrollText className="w-5 h-5" />
                        Events ({filteredLogs.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No events found{filterActor || filterType ? ' with current filters' : ''}.</p>
                        </div>
                    ) : (
                        filteredLogs.map(log => (
                            <div key={log.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                {getEventTypeIcon(log.event_type)}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {formatEventType(log.event_type)}
                                        </span>
                                        <Badge className={`text-xs ${getActorColor(log.actor)}`}>
                                            {log.actor}
                                        </Badge>
                                        {!log.applied_at && (
                                            <Badge variant="outline" className="text-xs text-yellow-600">
                                                Pending
                                            </Badge>
                                        )}
                                    </div>
                                    {log.payload && Object.keys(log.payload).length > 0 && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {JSON.stringify(log.payload).slice(0, 100)}
                                        </p>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatTimestamp(log.triggered_at)}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setFilterType(log.event_type === filterType ? null : log.event_type)}
                                >
                                    <Filter className="w-3 h-3" />
                                </Button>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
