// ============================================
// TimelineView — 캘린더 + 스케줄 슬롯 (독립 뷰)
// 주간/월간 전환 + 네비게이션
// ============================================

import { useMemo, useState, useCallback } from 'react'
import { useWorkItems } from '../../hooks/useWorkItems'
import { useFixedEvents } from '../../hooks/useFixedEvents'
import { useProjectDeadlines } from '../../hooks/useProjectDeadlines'
import { usePlans } from '../../hooks/usePlans'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
    Clock,
    Calendar,
    AlertTriangle,
    CheckCircle,
    MapPin,
    Zap,
    ListTodo,
    GitBranch,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import type { ViewType } from '../common/AppLayout'

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

    // 선택된 날짜의 이벤트
    const dayEvents = useMemo(() => {
        return fixedEvents.filter(e => {
            const eventDate = new Date(e.start_at)
            return isSameDay(eventDate, selectedDate)
        })
    }, [fixedEvents, selectedDate])

    // 선택된 날짜의 deadline
    const dayDeadlines = useMemo(() => {
        return deadlines.filter(d => {
            const dlDate = new Date(d.deadline_at)
            return isSameDay(dlDate, selectedDate)
        })
    }, [deadlines, selectedDate])

    // due_at이 선택된 날짜인 작업
    const dayTasks = useMemo(() => {
        return activeItems.filter(i => {
            if (!i.due_at) return false
            return isSameDay(new Date(i.due_at), selectedDate)
        })
    }, [activeItems, selectedDate])

    // due_at이 선택된 날짜인 plan
    const dayPlans = useMemo(() => {
        return plans.filter(p => {
            if (!p.due_at) return false
            return isSameDay(new Date(p.due_at), selectedDate)
        })
    }, [plans, selectedDate])

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
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>

            {/* Fixed Events */}
            {dayEvents.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            Fixed Events ({dayEvents.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {dayEvents.map(event => (
                            <div
                                key={event.id}
                                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => onNavigate?.('release-plan')}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    <div>
                                        <div className="font-medium text-sm">{event.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {' — '}
                                            {new Date(event.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                                <Badge variant={event.importance === 'critical' ? 'destructive' : 'outline'}>
                                    {event.importance}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Deadlines */}
            {dayDeadlines.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Deadlines ({dayDeadlines.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {dayDeadlines.map(dl => (
                            <div key={dl.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                <div>
                                    <div className="font-medium text-sm">{dl.milestone}</div>
                                    <div className="text-xs text-muted-foreground">Risk score: {dl.risk_score}%</div>
                                </div>
                                <Badge variant={dl.risk_score > 70 ? 'destructive' : 'outline'}>
                                    {dl.risk_score}% risk
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Tasks Due */}
            {dayTasks.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            Tasks Due ({dayTasks.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {dayTasks.map(task => (
                            <div
                                key={task.id}
                                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                                onClick={() => onNavigate?.('active-task')}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="flex items-center gap-3">
                                    <Zap className="w-4 h-4 text-yellow-600" />
                                    <div>
                                        <div className="font-medium text-sm">{task.title}</div>
                                        {task.next_action && (
                                            <div className="text-xs text-muted-foreground">Next: {task.next_action}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {task.estimate_min && (
                                        <Badge variant="outline" className="text-xs">{task.estimate_min}min</Badge>
                                    )}
                                    {task.energy && (
                                        <Badge variant="outline" className="text-xs">{task.energy}</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Plans Due */}
            {dayPlans.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ListTodo className="w-4 h-4 text-purple-500" />
                            Plans ({dayPlans.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {dayPlans.map(plan => {
                            const PlanIcon = plan.plan_type === 'project' ? GitBranch
                                : plan.plan_type === 'event' ? Calendar
                                    : ListTodo
                            return (
                                <div
                                    key={plan.id}
                                    className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors"
                                    onClick={() => onNavigate?.('release-plan')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="flex items-center gap-3">
                                        <PlanIcon className="w-4 h-4 text-purple-600" />
                                        <div>
                                            <div className="font-medium text-sm">{plan.title}</div>
                                            {plan.description && (
                                                <div className="text-xs text-muted-foreground line-clamp-1">{plan.description}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs capitalize">{plan.plan_type}</Badge>
                                        {plan.priority && (
                                            <Badge
                                                variant={plan.priority === 'critical' ? 'destructive' : 'outline'}
                                                className="text-xs"
                                            >
                                                {plan.priority}
                                            </Badge>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => void deletePlan(plan.id)}
                                            className="ml-1 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Empty state */}
            {dayEvents.length === 0 && dayDeadlines.length === 0 && dayTasks.length === 0 && dayPlans.length === 0 && (
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
