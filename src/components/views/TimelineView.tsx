// ============================================
// TimelineView — 캘린더 + 스케줄 슬롯 (독립 뷰)
// 주간/월간 전환 + 네비게이션
// ============================================

import { useMemo, useState, useCallback } from 'react'
import { useWorkItems } from '../../hooks/useWorkItems'
import { useFixedEvents } from '../../hooks/useFixedEvents'
import { useProjectDeadlines } from '../../hooks/useProjectDeadlines'
import { usePlans } from '../../hooks/usePlans'
import { generateOccurrences, getRecurrenceDescription } from '../../lib/utils/recurrence'
import type { FixedMetadata } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
    Clock,
    AlertTriangle,
    CheckCircle,
    MapPin,
    Zap,
    ListTodo,
    Repeat,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import type { ViewType } from '../common/AppLayout'

// ─── 통합 타임라인 아이템 ───
interface TimelineItem {
    id: string
    type: 'event' | 'deadline' | 'task' | 'plan' | 'fixed'
    title: string
    subtitle?: string
    time?: string
    date?: string          // monthly에서 날짜 표시용
    sortTime: number
    planId?: string        // plan 삭제용
    onClick?: () => void
}

// ─── 날짜 헬퍼 ───
function getWeekDates(baseDate: Date): Date[] {
    const dates: Date[] = []
    const start = new Date(baseDate)
    start.setDate(start.getDate() - start.getDay()) // 일요일 시작
    for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        dates.push(d)
    }
    return dates
}

function getMonthWeeks(baseDate: Date): Date[][] {
    const year = baseDate.getFullYear()
    const month = baseDate.getMonth()

    // 해당 월의 첫째 날
    const firstDay = new Date(year, month, 1)
    // 달력 시작: 첫째 날이 속한 주의 일요일
    const calStart = new Date(firstDay)
    calStart.setDate(calStart.getDate() - calStart.getDay())

    // 해당 월의 마지막 날
    const lastDay = new Date(year, month + 1, 0)
    // 달력 끝: 마지막 날이 속한 주의 토요일
    const calEnd = new Date(lastDay)
    calEnd.setDate(calEnd.getDate() + (6 - calEnd.getDay()))

    const weeks: Date[][] = []
    const current = new Date(calStart)
    while (current <= calEnd) {
        const week: Date[] = []
        for (let i = 0; i < 7; i++) {
            week.push(new Date(current))
            current.setDate(current.getDate() + 1)
        }
        weeks.push(week)
    }
    return weeks
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
}

function isSameMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type ViewMode = 'weekly' | 'monthly'

/** 선택 날짜가 속한 주의 시작(일)~끝(토) 반환 */
function getSelectedWeekRange(date: Date): [Date, Date] {
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay())
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return [start, end]
}

function isInDateRange(target: Date, rangeStart: Date, rangeEnd: Date): boolean {
    return target >= rangeStart && target <= rangeEnd
}

interface TimelineViewProps {
    onNavigate?: (tab: ViewType) => void
}

export function TimelineView({ onNavigate }: TimelineViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('weekly')
    const [baseDate, setBaseDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(new Date())
    const { items: activeItems, loading: itemsLoading } = useWorkItems({ status: 'active' })
    const { events: fixedEvents, loading: eventsLoading } = useFixedEvents()
    const { deadlines, loading: deadlinesLoading } = useProjectDeadlines({ upcomingDays: 14 })
    const { plans, loading: plansLoading, deletePlan } = usePlans()

    const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate])
    const monthWeeks = useMemo(() => getMonthWeeks(baseDate), [baseDate])
    const today = useMemo(() => new Date(), [])

    // ─── 네비게이션 ───
    const navigatePrev = useCallback(() => {
        setBaseDate(prev => {
            const d = new Date(prev)
            if (viewMode === 'weekly') {
                d.setDate(d.getDate() - 7)
            } else {
                d.setMonth(d.getMonth() - 1)
            }
            return d
        })
    }, [viewMode])

    const navigateNext = useCallback(() => {
        setBaseDate(prev => {
            const d = new Date(prev)
            if (viewMode === 'weekly') {
                d.setDate(d.getDate() + 7)
            } else {
                d.setMonth(d.getMonth() + 1)
            }
            return d
        })
    }, [viewMode])

    const goToToday = useCallback(() => {
        const now = new Date()
        setBaseDate(now)
        setSelectedDate(now)
    }, [])

    // 월간 뷰에서 주 클릭 → 해당 주간 뷰로 전환
    const focusWeek = useCallback((weekStartDate: Date) => {
        setBaseDate(new Date(weekStartDate))
        setViewMode('weekly')
    }, [])

    // 날짜별 이벤트 dot 확인용 헬퍼
    const hasEventOnDate = useCallback((date: Date) => {
        return fixedEvents.some(e => isSameDay(new Date(e.start_at), date))
    }, [fixedEvents])

    const hasDeadlineOnDate = useCallback((date: Date) => {
        return deadlines.some(d => isSameDay(new Date(d.deadline_at), date))
    }, [deadlines])

    const hasDueTaskOnDate = useCallback((date: Date) => {
        return activeItems.some(i => i.due_at && isSameDay(new Date(i.due_at), date))
    }, [activeItems])

    const hasPlanOnDate = useCallback((date: Date) => {
        return plans.some(p => p.due_at && isSameDay(new Date(p.due_at), date))
    }, [plans])

    // 반복 일정의 인스턴스가 해당 날짜에 있는지
    const hasRecurringOnDate = useCallback((date: Date) => {
        return plans.some(p => {
            if (p.plan_type !== 'fixed') return false
            const meta = p.metadata as unknown as FixedMetadata
            if (!meta?.recurrence) return false
            const startDate = new Date(meta.start_at)
            const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)
            const occ = generateOccurrences(meta.recurrence, startDate, { from: dayStart, to: dayEnd })
            return occ.length > 0
        })
    }, [plans])

    // ─── plans와 연결된 fixed_event_id 목록 (중복 방지) ───
    const linkedEventIds = useMemo(() => {
        const ids = new Set<string>()
        plans.forEach(p => {
            if (p.plan_type === 'fixed') {
                const meta = p.metadata as unknown as FixedMetadata
                if (meta?.fixed_event_id) ids.add(meta.fixed_event_id)
            }
        })
        return ids
    }, [plans])

    // ─── 날짜 매칭 헬퍼: weekly=하루, monthly=선택 날짜의 주 ───
    const matchesDate = useCallback((target: Date) => {
        if (viewMode === 'weekly') {
            return isSameDay(target, selectedDate)
        }
        // monthly: 선택 날짜가 속한 주 전체
        const [weekStart, weekEnd] = getSelectedWeekRange(selectedDate)
        return isInDateRange(target, weekStart, weekEnd)
    }, [viewMode, selectedDate])

    // ─── 통합 타임라인 아이템 생성 ───
    const timelineItems = useMemo(() => {
        const items: TimelineItem[] = []

        // Fixed Events (plans와 연결된 건은 skip — plans 쪽에서 렌더링)
        fixedEvents.forEach(e => {
            if (linkedEventIds.has(e.id)) return
            if (!matchesDate(new Date(e.start_at))) return
            const eDate = new Date(e.start_at)
            items.push({
                id: `event-${e.id}`,
                type: 'event',
                title: e.title,
                subtitle: e.importance,
                time: eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: eDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                sortTime: eDate.getTime(),
                onClick: () => onNavigate?.('release-plan'),
            })
        })

        // Deadlines
        deadlines.forEach(d => {
            if (!matchesDate(new Date(d.deadline_at))) return
            const dDate = new Date(d.deadline_at)
            items.push({
                id: `deadline-${d.id}`,
                type: 'deadline',
                title: d.milestone,
                subtitle: `Risk: ${d.risk_score}%`,
                time: dDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: dDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                sortTime: dDate.getTime(),
            })
        })

        // Tasks Due
        activeItems.forEach(t => {
            if (!t.due_at || !matchesDate(new Date(t.due_at))) return
            const tDate = new Date(t.due_at)
            items.push({
                id: `task-${t.id}`,
                type: 'task',
                title: t.title,
                subtitle: t.next_action || undefined,
                time: tDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: tDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                sortTime: tDate.getTime(),
                onClick: () => onNavigate?.('active-task'),
            })
        })

        // Plans (task/event/project)
        plans.forEach(p => {
            if (p.plan_type === 'fixed') {
                const meta = p.metadata as unknown as FixedMetadata
                if (meta?.recurrence) {
                    const startDate = new Date(meta.start_at)
                    // monthly: 주 범위 / weekly: 하루 범위
                    let rangeStart: Date, rangeEnd: Date
                    if (viewMode === 'monthly') {
                        [rangeStart, rangeEnd] = getSelectedWeekRange(selectedDate)
                    } else {
                        rangeStart = new Date(selectedDate); rangeStart.setHours(0, 0, 0, 0)
                        rangeEnd = new Date(selectedDate); rangeEnd.setHours(23, 59, 59, 999)
                    }
                    const occurrences = generateOccurrences(meta.recurrence, startDate, { from: rangeStart, to: rangeEnd })
                    occurrences.forEach(occ => {
                        const recDesc = getRecurrenceDescription(meta.recurrence!)
                        items.push({
                            id: `fixed-${p.id}-${occ.toISOString()}`,
                            type: 'fixed',
                            title: p.title,
                            subtitle: `🔁 ${recDesc}`,
                            time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            date: occ.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                            sortTime: occ.getTime(),
                            planId: p.id,
                            onClick: () => onNavigate?.('release-plan'),
                        })
                    })
                } else {
                    if (!meta?.start_at || !matchesDate(new Date(meta.start_at))) return
                    const fixDate = new Date(meta.start_at)
                    items.push({
                        id: `fixed-${p.id}`,
                        type: 'fixed',
                        title: p.title,
                        subtitle: p.description || '고정 일정',
                        time: fixDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        date: fixDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                        sortTime: fixDate.getTime(),
                        planId: p.id,
                        onClick: () => onNavigate?.('release-plan'),
                    })
                }
                return
            }
            if (!p.due_at || !matchesDate(new Date(p.due_at))) return
            const pDate = new Date(p.due_at)
            items.push({
                id: `plan-${p.id}`,
                type: 'plan',
                title: p.title,
                subtitle: p.description || undefined,
                time: pDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: pDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                sortTime: pDate.getTime(),
                planId: p.id,
                onClick: () => onNavigate?.('release-plan'),
            })
        })

        // 시간순 정렬
        return items.sort((a, b) => a.sortTime - b.sortTime)
    }, [fixedEvents, deadlines, activeItems, plans, selectedDate, matchesDate, onNavigate, viewMode])

    const loading = itemsLoading || eventsLoading || deadlinesLoading || plansLoading

    // 헤더 타이틀
    const headerTitle = useMemo(() => {
        if (viewMode === 'monthly') {
            return baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
        const start = weekDates[0]
        const end = weekDates[6]
        if (start.getMonth() === end.getMonth()) {
            return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
        }
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }, [viewMode, baseDate, weekDates])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-muted rounded animate-pulse w-48" />
                <div className="h-20 bg-muted rounded animate-pulse" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    // ─── 날짜 셀 렌더링 (공유) ───
    const renderDateCell = (date: Date, compact = false) => {
        const isToday = isSameDay(date, today)
        const isSelected = isSameDay(date, selectedDate)
        const hasEvent = hasEventOnDate(date)
        const hasDeadline = hasDeadlineOnDate(date)
        const hasDueTask = hasDueTaskOnDate(date)
        const hasPlan = hasPlanOnDate(date)
        const hasRecurring = hasRecurringOnDate(date)
        const isCurrentMonth = isSameMonth(date, baseDate)

        return (
            <button
                key={date.toISOString()}
                type="button"
                onClick={() => setSelectedDate(new Date(date))}
                className={`
                    flex flex-col items-center ${compact ? 'p-1.5' : 'p-3'} rounded-lg transition-colors cursor-pointer
                    ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                    ${isToday && !isSelected ? 'ring-2 ring-primary' : ''}
                    ${!isCurrentMonth && viewMode === 'monthly' ? 'opacity-40' : ''}
                `}
            >
                {!compact && <span className="text-xs opacity-70">{dayNames[date.getDay()]}</span>}
                <span className={`${compact ? 'text-sm' : 'text-lg'} font-medium`}>{date.getDate()}</span>
                <div className="flex gap-0.5 mt-0.5">
                    {hasEvent && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    {hasDeadline && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    {hasDueTask && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                    {hasPlan && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                    {hasRecurring && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </div>
            </button>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold">Timeline</h2>
                    <p className="text-muted-foreground">Schedule overview and upcoming events</p>
                </div>
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                        variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('weekly')}
                        className="text-xs h-7 px-3"
                    >
                        Weekly
                    </Button>
                    <Button
                        variant={viewMode === 'monthly' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('monthly')}
                        className="text-xs h-7 px-3"
                    >
                        Monthly
                    </Button>
                </div>
            </div>

            {/* Calendar */}
            <Card>
                <CardContent className="p-4">
                    {/* Navigation Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={navigatePrev} className="h-8 w-8 p-0">
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <h3 className="font-medium text-base min-w-[200px] text-center">
                                {headerTitle}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={navigateNext} className="h-8 w-8 p-0">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-7">
                            Today
                        </Button>
                    </div>

                    {viewMode === 'weekly' ? (
                        /* ─── 주간 뷰 ─── */
                        <div className="grid grid-cols-7 gap-2">
                            {weekDates.map(date => renderDateCell(date))}
                        </div>
                    ) : (
                        /* ─── 월간 뷰 ─── */
                        <div>
                            {/* Day Headers */}
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {dayNames.map(name => (
                                    <div key={name} className="text-center text-xs text-muted-foreground font-medium py-1">
                                        {name}
                                    </div>
                                ))}
                            </div>
                            {/* Weeks */}
                            {monthWeeks.map((week, weekIdx) => (
                                <div key={weekIdx} className="group relative">
                                    <div className="grid grid-cols-7 gap-1">
                                        {week.map(date => renderDateCell(date, true))}
                                    </div>
                                    {/* 주 포커스 버튼 — hover 시 표시 */}
                                    <button
                                        type="button"
                                        onClick={() => focusWeek(week[0])}
                                        className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-pointer shadow-sm"
                                        title="Focus this week"
                                    >
                                        →
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Selected Date Details */}
            <div className="text-lg font-medium">
                {viewMode === 'monthly' ? (() => {
                    const [ws, we] = getSelectedWeekRange(selectedDate)
                    if (ws.getMonth() === we.getMonth()) {
                        return `${ws.toLocaleDateString('en-US', { month: 'long' })} ${ws.getDate()} – ${we.getDate()}`
                    }
                    return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                })() : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>

            {/* ─── 통합 타임라인 (3열 그리드) ─── */}
            {timelineItems.length > 0 ? (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="w-4 h-4" />
                            Schedule ({timelineItems.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {timelineItems.map(item => {
                                const colorMap = {
                                    event: { bg: 'bg-blue-50 dark:bg-blue-950/30', hover: 'hover:bg-blue-100 dark:hover:bg-blue-950/50', icon: 'text-blue-600', dot: 'bg-blue-500' },
                                    deadline: { bg: 'bg-red-50 dark:bg-red-950/30', hover: 'hover:bg-red-100 dark:hover:bg-red-950/50', icon: 'text-red-600', dot: 'bg-red-500' },
                                    task: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-950/50', icon: 'text-yellow-600', dot: 'bg-yellow-500' },
                                    plan: { bg: 'bg-purple-50 dark:bg-purple-950/30', hover: 'hover:bg-purple-100 dark:hover:bg-purple-950/50', icon: 'text-purple-600', dot: 'bg-purple-500' },
                                    fixed: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-950/50', icon: 'text-emerald-600', dot: 'bg-emerald-500' },
                                }
                                const colors = colorMap[item.type]
                                const IconComponent = item.type === 'event' ? MapPin
                                    : item.type === 'deadline' ? AlertTriangle
                                        : item.type === 'task' ? Zap
                                            : item.type === 'fixed' ? Repeat
                                                : ListTodo

                                return (
                                    <div
                                        key={item.id}
                                        className={`p-3 rounded-lg transition-colors ${colors.bg} ${colors.hover} ${item.onClick ? 'cursor-pointer' : ''}`}
                                        onClick={item.onClick}
                                        role={item.onClick ? 'button' : undefined}
                                        tabIndex={item.onClick ? 0 : undefined}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2 min-w-0 flex-1">
                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
                                                <div className="min-w-0">
                                                    <div className="font-medium text-sm truncate">{item.title}</div>
                                                    {item.subtitle && (
                                                        <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                                                    )}
                                                    {(item.time || item.date) && (
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            {viewMode === 'monthly' && item.date ? `${item.date} · ${item.time ?? ''}` : item.time}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <IconComponent className={`w-3.5 h-3.5 ${colors.icon}`} />
                                                {item.planId && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); void deletePlan(item.planId!) }}
                                                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No events, deadlines, or tasks due on this day.</p>
                    </CardContent>
                </Card>
            )}

            {/* Upcoming Deadlines Overview */}
            {deadlines.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Upcoming Deadlines (Next 14 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {deadlines.map(dl => (
                            <div key={dl.id} className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${dl.risk_score > 70 ? 'bg-red-500' : dl.risk_score > 40 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                    <span className="text-sm">{dl.milestone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(dl.deadline_at).toLocaleDateString()}
                                    </span>
                                    <Badge variant={dl.risk_score > 70 ? 'destructive' : 'outline'} className="text-xs">
                                        {dl.risk_score}%
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
