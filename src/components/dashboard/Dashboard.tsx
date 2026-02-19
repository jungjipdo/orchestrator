// ============================================
// Dashboard — 요약 뷰 전용 (Tailwind + shadcn)
// 뷰 전환 로직은 AppLayout으로 이전됨
// ============================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFixedEvents } from '../../hooks/useFixedEvents'
import { useProjectDeadlines } from '../../hooks/useProjectDeadlines'
import { useWorkItems } from '../../hooks/useWorkItems'
import { usePlans } from '../../hooks/usePlans'
import type { SessionLog } from '../../types/index'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import type { ViewType } from '../common/AppLayout'
import {
    GitBranch,
    Zap,
    Clock,
    ListTodo,
    Activity,
    Calendar,
    AlertTriangle,
    Trash2,
    Github,
    ArrowRight,
} from 'lucide-react'
import { PlanCreateModal } from './PlanCreateModal'
import { ProjectImportModal } from './ProjectImportModal'
import { useProjects } from '../../hooks/useProjects'

// ─── Props ───
interface DashboardProps {
    activeTab: string
    refreshTrigger: number
    refresh: () => void
    activeSession: SessionLog | null
    onNavigate?: (tab: ViewType) => void
}

export function Dashboard({ refreshTrigger, refresh, onNavigate }: DashboardProps) {
    const [planModalOpen, setPlanModalOpen] = useState(false)
    const [projectModalOpen, setProjectModalOpen] = useState(false)
    const initialLoaded = useRef(false)

    // ─── Data Hooks ───
    const { items: candidateItems, loading: candidateLoading, refresh: refreshCandidates } = useWorkItems({ status: 'candidate' })
    const { items: activeWorkItems, loading: activeLoading, refresh: refreshActiveItems } = useWorkItems({ status: 'active' })
    const { events: todayEvents, loading: eventsLoading, refresh: refreshFixedEvents } = useFixedEvents({ todayOnly: true })
    const { deadlines: _upcomingDeadlines, loading: deadlinesLoading, refresh: refreshDeadlines } = useProjectDeadlines({ upcomingDays: 7 })
    const { plans, loading: plansLoading, refresh: refreshPlans, deletePlan } = usePlans()
    const { projects, loading: projectsLoading, refresh: refreshProjects, importProject } = useProjects()

    // ─── Refresh ───
    const refreshAll = useCallback(async () => {
        await Promise.all([
            refreshCandidates(),
            refreshActiveItems(),
            refreshFixedEvents(),
            refreshDeadlines(),
            refreshPlans(),
            refreshProjects(),
        ])
    }, [refreshCandidates, refreshActiveItems, refreshFixedEvents, refreshDeadlines, refreshPlans, refreshProjects])

    useEffect(() => {
        void refreshAll()
    }, [refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Initial load tracking (깜빡임 방지) ───
    const anyLoading = candidateLoading || activeLoading || eventsLoading || deadlinesLoading || plansLoading || projectsLoading
    useEffect(() => {
        if (!anyLoading && !initialLoaded.current) initialLoaded.current = true
    }, [anyLoading])
    const showLoading = !initialLoaded.current && anyLoading

    // ─── Derived ───
    const activePlanCount = plans.filter(p => p.status === 'active').length
    const activeProjectCount = projects.filter(p => p.status === 'active').length

    // ─── Handlers ───
    const handlePlanComplete = useCallback(() => {
        void refreshAll()
        refresh()
    }, [refreshAll, refresh])

    // ─── Loading ───
    if (showLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-muted-foreground">데이터 로딩 중...</div>
            </div>
        )
    }

    const totalTasks = candidateItems.length + activeWorkItems.length + plans.length + projects.length
    const activeCount = activeWorkItems.length + activePlanCount + activeProjectCount

    return (
        <div className="space-y-6">
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl mb-1">Release Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Continuous development with intelligent orchestration</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled>
                        <Zap className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">AI Insights</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setProjectModalOpen(true)}>
                        <Github className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Project</span>
                    </Button>
                    <Button size="sm" onClick={() => setPlanModalOpen(true)}>
                        <GitBranch className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Plan</span>
                    </Button>
                </div>
            </div>

            {/* Key Metrics — 5 cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <Card className="border-l-4 border-l-violet-500 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Total</CardTitle>
                        <ListTodo className="w-4 h-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTasks}</div>
                        <p className="text-xs text-muted-foreground">all items</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Plans</CardTitle>
                        <GitBranch className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{plans.length}</div>
                        <p className="text-xs text-muted-foreground">{activePlanCount} active</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Projects</CardTitle>
                        <Github className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{projects.length}</div>
                        <p className="text-xs text-muted-foreground">GitHub repos</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Active</CardTitle>
                        <Activity className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                        <p className="text-xs text-muted-foreground">{activePlanCount + activeProjectCount} plans/projects</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-rose-500 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Today</CardTitle>
                        <Calendar className="w-4 h-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{todayEvents.length}</div>
                        <p className="text-xs text-muted-foreground">events</p>
                    </CardContent>
                </Card>
            </div>



            {/* Active Work Items */}
            {activeWorkItems.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl">Active Work Items</h2>
                    {activeWorkItems.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{item.title}</CardTitle>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <Badge className="bg-green-500 text-white">Active</Badge>
                                            {item.next_action && <span>Next: {item.next_action}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-muted-foreground">
                                            {item.estimate_min ? `${item.estimate_min}min` : '—'}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Progress value={50} className="h-2" />
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>Energy: {item.energy ?? '—'}</span>
                                    </div>
                                    {item.due_at && (
                                        <div className="flex items-center gap-1 text-sm text-destructive">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span>Due: {new Date(item.due_at).toLocaleDateString('ko-KR')}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Projects */}
            {projects.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl">Projects ({projects.length})</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {projects.map((project) => (
                            <Card key={project.id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Github className="w-5 h-5 text-muted-foreground shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-sm truncate">{project.repo_full_name}</div>
                                            {project.description && (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                {project.language && (
                                                    <Badge variant="outline" className="text-xs">{project.language}</Badge>
                                                )}
                                                <Badge variant={project.status === 'active' ? 'default' : 'outline'} className="text-xs capitalize">{project.status}</Badge>
                                                {project.is_private && (
                                                    <Badge variant="outline" className="text-xs text-yellow-600">private</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Plans */}
            {plans.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl">Recent Plans</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => onNavigate?.('release-plan')}
                        >
                            모두 보기
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {plans.slice(0, 5).map((plan) => {
                            const typeColor = plan.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground/30'
                            return (
                                <Card key={plan.id} className="hover:shadow-sm transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${typeColor}`} />
                                                <div>
                                                    <div className="font-medium text-sm">{plan.title}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-xs capitalize">{plan.plan_type}</Badge>
                                                        {plan.priority && (
                                                            <Badge
                                                                variant={plan.priority === 'critical' ? 'destructive' : 'outline'}
                                                                className="text-xs"
                                                            >
                                                                {plan.priority}
                                                            </Badge>
                                                        )}
                                                        {plan.due_at && (
                                                            <span className="text-xs text-muted-foreground">
                                                                Due: {new Date(plan.due_at).toLocaleDateString('ko-KR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => void deletePlan(plan.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}



            {/* Plan Modal */}
            <PlanCreateModal
                open={planModalOpen}
                onOpenChange={setPlanModalOpen}
                onPlanComplete={handlePlanComplete}
            />

            {/* Project Import Modal */}
            <ProjectImportModal
                open={projectModalOpen}
                onOpenChange={setProjectModalOpen}
                onImport={async (input) => {
                    await importProject(input)
                }}
                importedRepoIds={new Set(projects.map((p) => p.repo_id))}
            />
        </div>
    )
}
