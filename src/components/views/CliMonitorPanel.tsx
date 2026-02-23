// ============================================
// CliMonitorPanel — CLI 이벤트 실시간 모니터링 패널
// OrchestrationView 하단에 배치
// ============================================

import { useState } from 'react'
import { useCliEvents } from '../../hooks/useCliEvents'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import {
    Activity,
    FileText,
    AlertTriangle,
    TestTube2,
    ClipboardCheck,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Radio,
} from 'lucide-react'
import { Button } from '../ui/button'

// === 이벤트 타입별 설정 ===

interface EventTypeConfig {
    icon: React.ReactNode
    label: string
    color: string
    bgColor: string
    borderColor: string
}

const EVENT_TYPE_MAP: Record<string, EventTypeConfig> = {
    'file.changed': {
        icon: <FileText className="w-4 h-4" />,
        label: '파일 변경',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
    'contract.violation': {
        icon: <AlertTriangle className="w-4 h-4" />,
        label: '계약 위반',
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
    },
    'test.completed': {
        icon: <TestTube2 className="w-4 h-4" />,
        label: '테스트 완료',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
    },
    'task.claimed': {
        icon: <ClipboardCheck className="w-4 h-4" />,
        label: 'Task 할당',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
    },
}

const DEFAULT_CONFIG: EventTypeConfig = {
    icon: <Activity className="w-4 h-4" />,
    label: '이벤트',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
}

// === 시간 포맷 ===

function timeAgo(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}초 전`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}분 전`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}시간 전`
    return `${Math.floor(hours / 24)}일 전`
}

// === 컴포넌트 ===

export function CliMonitorPanel() {
    const { events, loading, error, refresh } = useCliEvents({ limit: 50 })
    const [isExpanded, setIsExpanded] = useState(true)
    const [filter, setFilter] = useState<string | null>(null)

    const filteredEvents = filter
        ? events.filter(e => e.event_type === filter)
        : events

    // 이벤트 타입별 카운트
    const typeCounts = events.reduce<Record<string, number>>((acc, e) => {
        acc[e.event_type] = (acc[e.event_type] ?? 0) + 1
        return acc
    }, {})

    const violationCount = typeCounts['contract.violation'] ?? 0

    return (
        <Card>
            <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Radio className={`w-4 h-4 ${events.length > 0 ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                        CLI Monitor
                        {violationCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                                {violationCount} 위반
                            </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs font-normal">
                            {events.length} events
                        </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); void refresh() }}
                            className="h-8 w-8 p-0"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4">
                    {/* 에러 */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* 타입 필터 */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setFilter(null)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === null
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            전체 ({events.length})
                        </button>
                        {Object.entries(typeCounts).map(([type, count]) => {
                            const config = EVENT_TYPE_MAP[type] ?? DEFAULT_CONFIG
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFilter(filter === type ? null : type)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${filter === type
                                        ? `${config.bgColor} ${config.color} border ${config.borderColor}`
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                >
                                    {config.icon}
                                    {config.label} ({count})
                                </button>
                            )
                        })}
                    </div>

                    {/* 이벤트 리스트 */}
                    {loading && events.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            로딩 중...
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {events.length === 0
                                ? 'CLI 이벤트가 없습니다. orchx sync send로 이벤트를 전송해보세요.'
                                : '해당 타입의 이벤트가 없습니다.'
                            }
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {filteredEvents.map((event) => {
                                const config = EVENT_TYPE_MAP[event.event_type] ?? DEFAULT_CONFIG
                                const payload = event.payload as Record<string, unknown>

                                return (
                                    <div
                                        key={event.id}
                                        className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor} transition-all`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={config.color}>{config.icon}</span>
                                                <span className={`text-sm font-medium ${config.color}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {timeAgo(event.created_at)}
                                            </span>
                                        </div>

                                        {/* 페이로드 상세 */}
                                        {payload && Object.keys(payload).length > 0 && (
                                            <div className="mt-2 text-xs text-muted-foreground space-y-0.5 pl-6">
                                                {'path' in payload && (
                                                    <div className="font-mono truncate">
                                                        📂 {String(payload.path)}
                                                    </div>
                                                )}
                                                {'reason' in payload && (
                                                    <div className="text-red-500">
                                                        ⚠️ {String(payload.reason)}
                                                    </div>
                                                )}
                                                {'passed' in payload && (
                                                    <div>
                                                        ✅ {String(payload.passed)} pass / ❌ {String(payload.failed)} fail
                                                        {'duration_ms' in payload ? ` • ${String(payload.duration_ms)}ms` : ''}
                                                    </div>
                                                )}
                                                {'session_id' in payload && (
                                                    <div className="font-mono truncate">
                                                        🔗 {String(payload.session_id).slice(0, 8)}...
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}
