// ============================================
// Dashboard — Phase 4 메인 화면
// 데스크톱 무스크롤 + GUI 우선 명령 환경
// ============================================

import { useCallback, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router'
import { executeCommand } from '../../features/workflow/commandExecutor'
import { parseCommand } from '../../features/workflow/commandParser'
import { useEventLogs } from '../../hooks/useEventLogs'
import { useFixedEvents } from '../../hooks/useFixedEvents'
import { useProjectDeadlines } from '../../hooks/useProjectDeadlines'
import { useSessionLog } from '../../hooks/useSessionLog'
import { useTheme } from '../../hooks/useTheme'
import { useWorkItems } from '../../hooks/useWorkItems'
import type { ScheduleSlot as PlanSlot } from '../../types/index'
import type { AISuggestionOption, OutletContextType } from '../../types/ui'
import { SuggestionPanel } from '../command/SuggestionPanel'
import { EmptyState } from '../common/EmptyState'
import { ActiveTaskPanel } from './ActiveTaskPanel'
import { AppRail } from './AppRail'
import { CalendarStrip } from './CalendarStrip'
import { EventLogFeed } from './EventLogFeed'
import { ScheduleSlot } from './ScheduleSlot'
import { WorkItemCard } from './WorkItemCard'
import './Dashboard.css'

export function Dashboard() {
    const { refreshTrigger } = useOutletContext<OutletContextType>()
    const { theme, toggleTheme } = useTheme()

    const {
        items: candidateItems,
        loading: candidateLoading,
        refresh: refreshCandidates,
    } = useWorkItems({ status: 'candidate' })
    const {
        items: activeWorkItems,
        loading: activeLoading,
        refresh: refreshActiveItems,
    } = useWorkItems({ status: 'active' })
    const {
        events: todayEvents,
        loading: fixedEventsLoading,
        refresh: refreshFixedEvents,
    } = useFixedEvents({ todayOnly: true })
    const {
        deadlines: upcomingDeadlines,
        loading: deadlinesLoading,
        refresh: refreshDeadlines,
    } = useProjectDeadlines({ upcomingDays: 7 })
    const {
        activeSession,
        refresh: refreshSession,
    } = useSessionLog()
    const {
        logs: eventLogItems,
        loading: eventLogLoading,
        refresh: refreshEventLogs,
    } = useEventLogs({ limit: 30 })

    const refreshAll = useCallback(async () => {
        await Promise.all([
            refreshCandidates(),
            refreshActiveItems(),
            refreshFixedEvents(),
            refreshDeadlines(),
            refreshSession(),
            refreshEventLogs(),
        ])
    }, [refreshCandidates, refreshActiveItems, refreshFixedEvents, refreshDeadlines, refreshSession, refreshEventLogs])

    useEffect(() => {
        void refreshAll()
    }, [refreshTrigger, refreshAll])

    const loading = candidateLoading || activeLoading || fixedEventsLoading || deadlinesLoading || eventLogLoading

    const executeRawCommand = useCallback(async (raw: string) => {
        const parsed = parseCommand(raw)
        if (!parsed.success) return

        await executeCommand(parsed.command)
        await refreshAll()
    }, [refreshAll])

    const handleFocus = useCallback(async (itemId: string) => {
        await executeRawCommand(`/focus ${itemId}`)
    }, [executeRawCommand])

    const handleClose = useCallback(async (itemId: string, doneLog: string) => {
        await executeRawCommand(`/close ${itemId} ${doneLog}`)
    }, [executeRawCommand])

    const latestSlots = useMemo(() => {
        const latestPlanEvent = eventLogItems.find((log) => log.event_type === 'schedule.new')
        if (!latestPlanEvent) return [] as PlanSlot[]

        const payload = latestPlanEvent.payload as {
            plan?: {
                slots?: PlanSlot[]
            }
        }

        if (!payload.plan?.slots || !Array.isArray(payload.plan.slots)) {
            return [] as PlanSlot[]
        }

        return payload.plan.slots.slice(0, 6)
    }, [eventLogItems])

    const aiOptions = useMemo<AISuggestionOption[]>(() => [
        {
            label: 'A',
            title: '기존 순서를 유지하고 슬롯만 재조정',
            timeCost: '+10m',
            risk: '낮음',
            expectedEffect: '현재 흐름 유지, 충돌 최소화',
        },
        {
            label: 'B',
            title: '저우선 후보를 뒤로 미루고 집중 블록 확보',
            timeCost: '+0m',
            risk: '중간',
            expectedEffect: '오늘 완료율 상승',
        },
        {
            label: 'C',
            title: '긴급 이벤트 우선 재배치 후 남은 시간 재계산',
            timeCost: '+20m',
            risk: '중간',
            expectedEffect: '긴급 대응 안정성 강화',
        },
    ], [])

    const titleById = useMemo(() => {
        const map = new Map<string, string>()

        for (const item of [...candidateItems, ...activeWorkItems]) {
            map.set(item.id, item.title)
        }

        return map
    }, [candidateItems, activeWorkItems])

    return (
        <div className="dashboard">
            <section className="dashboard-main">
                <header className="dashboard-main__header">
                    <div>
                        <h1>Orchestrator Workspace</h1>
                        <p>Mac main · iPhone compact parity</p>
                    </div>
                    <div className="dashboard-main__stats">
                        <span>candidate {candidateItems.length}</span>
                        <span>active {activeWorkItems.length}</span>
                        <span>events {eventLogItems.length}</span>
                    </div>
                </header>

                <CalendarStrip events={todayEvents} deadlines={upcomingDeadlines} />

                <div className="dashboard-main__grid">
                    <section className="dashboard-card">
                        <div className="dashboard-card__head">
                            <h2>Dynamic Queue</h2>
                            <span>Focus 가능한 작업 우선</span>
                        </div>

                        {loading ? (
                            <p className="dashboard-card__loading">데이터 로딩 중...</p>
                        ) : candidateItems.length === 0 ? (
                            <EmptyState message="후보 작업이 없습니다" subMessage="/capture 또는 GUI Plan을 먼저 실행하세요" icon="🧩" />
                        ) : (
                            <div className="dashboard-card__list">
                                {candidateItems.slice(0, 4).map((item) => (
                                    <WorkItemCard
                                        key={item.id}
                                        item={item}
                                        onFocus={handleFocus}
                                        disableFocus={!!activeSession}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="dashboard-card">
                        <ActiveTaskPanel activeItems={activeWorkItems} onClose={handleClose} />
                    </section>

                    <section className="dashboard-card">
                        <div className="dashboard-card__head">
                            <h2>Schedule Slots</h2>
                            <span>25 / 50 / 90 분 블록</span>
                        </div>

                        {latestSlots.length === 0 ? (
                            <EmptyState message="아직 슬롯 제안이 없습니다" subMessage="상단 Plan 버튼으로 슬롯을 생성하세요" icon="⏱️" />
                        ) : (
                            <div className="dashboard-card__list">
                                {latestSlots.slice(0, 4).map((slot) => (
                                    <ScheduleSlot
                                        key={`${slot.work_item_id}-${slot.start}`}
                                        slot={slot}
                                        title={titleById.get(slot.work_item_id) ?? 'Unknown task'}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="dashboard-card">
                        <div className="dashboard-card__head">
                            <h2>Event Feed</h2>
                            <span>충돌은 제안만 생성</span>
                        </div>
                        <EventLogFeed logs={eventLogItems} loading={eventLogLoading} />
                    </section>

                    <section className="dashboard-card">
                        <div className="dashboard-card__head">
                            <h2>AI Suggestion</h2>
                            <span>옵션 A/B/C</span>
                        </div>
                        <SuggestionPanel mode="ai" visible options={aiOptions} recommended="B" />
                    </section>
                </div>
            </section>

            <AppRail />

            <button
                type="button"
                className="theme-floating-toggle"
                onClick={toggleTheme}
                title="B/W Toggle"
            >
                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                <strong>B/W</strong>
            </button>
        </div>
    )
}
