// ============================================
// ReleasePlanView — Kanban + 3-Tier 계층 (v2)
// [🔧 Projects | 📋 Plans] 세그먼트 → 3-Tier Tab → Kanban Board
// ============================================

import { useMemo, useState, useCallback } from 'react'
import { useWorkItems } from '../../hooks/useWorkItems'
import { usePlans } from '../../hooks/usePlans'
import { useProjects } from '../../hooks/useProjects'
import { useGoals } from '../../hooks/useGoals'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import {
    AlertTriangle,
    GitBranch,
    ChevronRight,
    Plus,
    X,
    Check,
    Layers,
    Target,
    ListTodo,
    FolderOpen,
    FileText,
    ArrowLeft,
} from 'lucide-react'

// ─── 타입 ───

type Track = 'projects' | 'plans'
type TierLevel = 1 | 2 | 3

interface NavigationState {
    track: Track
    level: TierLevel
    selectedParentId: string | null  // Level 1에서 선택한 Project/Plan ID
    selectedGoalId: string | null    // Level 2에서 선택한 Goal ID
    parentTitle: string | null
    goalTitle: string | null
}

// ─── Kanban 컬럼 정의 ───

const KANBAN_COLUMNS = {
    level1: [
        { key: 'active', label: 'Active', color: 'border-blue-400', bg: 'bg-blue-50/30', headerBg: 'bg-blue-500' },
        { key: 'watching', label: 'Watching', color: 'border-amber-400', bg: 'bg-amber-50/30', headerBg: 'bg-amber-500' },
        { key: 'archived', label: 'Archived', color: 'border-gray-400', bg: 'bg-gray-50/30', headerBg: 'bg-gray-500' },
    ],
    level2: [
        { key: 'backlog', label: 'Backlog', color: 'border-gray-300', bg: 'bg-gray-50/30', headerBg: 'bg-gray-500' },
        { key: 'active', label: 'Active', color: 'border-blue-400', bg: 'bg-blue-50/30', headerBg: 'bg-blue-500' },
        { key: 'done', label: 'Done', color: 'border-emerald-400', bg: 'bg-emerald-50/30', headerBg: 'bg-emerald-500' },
        { key: 'deferred', label: 'Deferred', color: 'border-gray-300', bg: 'bg-gray-50/20', headerBg: 'bg-gray-400' },
    ],
    level3: [
        { key: 'backlog', label: 'Backlog', color: 'border-gray-300', bg: 'bg-gray-50/30', headerBg: 'bg-gray-500' },
        { key: 'active', label: 'Active', color: 'border-blue-400', bg: 'bg-blue-50/30', headerBg: 'bg-blue-500' },
        { key: 'blocked', label: 'Blocked', color: 'border-red-400', bg: 'bg-red-50/30', headerBg: 'bg-red-500' },
        { key: 'done', label: 'Done', color: 'border-emerald-400', bg: 'bg-emerald-50/30', headerBg: 'bg-emerald-500' },
    ],
} as const

// ═══════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════

export function ReleasePlanView() {
    const { items: allItems, loading: itemsLoading, updateItem, removeItem, addItem } = useWorkItems()
    const { plans, loading: plansLoading, deletePlan } = usePlans()
    const { projects, loading: projectsLoading, removeProject, updateProjectStatus } = useProjects()

    const loading = itemsLoading || plansLoading || projectsLoading

    // ─── 네비게이션 상태 ───
    const [nav, setNav] = useState<NavigationState>({
        track: 'projects',
        level: 1,
        selectedParentId: null,
        selectedGoalId: null,
        parentTitle: null,
        goalTitle: null,
    })

    // ─── Side Panel ───
    const [sidePanelItemId, setSidePanelItemId] = useState<string | null>(null)
    const sidePanelItem = useMemo(
        () => allItems.find(i => i.id === sidePanelItemId),
        [allItems, sidePanelItemId],
    )

    // ─── Goals 훅 (Level 2에서 사용) ───
    const goalsFilter = useMemo(() => {
        if (nav.level < 2 || !nav.selectedParentId) return undefined
        return nav.track === 'projects'
            ? { projectId: nav.selectedParentId }
            : { planId: nav.selectedParentId }
    }, [nav.level, nav.selectedParentId, nav.track])
    const { goals, loading: goalsLoading, addGoal, editGoal, removeGoal } = useGoals(goalsFilter)

    // ─── Level 3: Goal에 속하는 WorkItems ───
    const goalItems = useMemo(() => {
        if (!nav.selectedGoalId) return []
        return allItems.filter(i => i.goal_id === nav.selectedGoalId && !i.deleted_at)
    }, [allItems, nav.selectedGoalId])

    // ─── 네비게이션 헬퍼 ───
    const navigateTo = useCallback((level: TierLevel, id?: string, title?: string) => {
        setNav(prev => {
            if (level === 1) {
                return { ...prev, level: 1, selectedParentId: null, selectedGoalId: null, parentTitle: null, goalTitle: null }
            }
            if (level === 2 && id) {
                return { ...prev, level: 2, selectedParentId: id, selectedGoalId: null, parentTitle: title ?? null, goalTitle: null }
            }
            if (level === 3 && id) {
                return { ...prev, level: 3, selectedGoalId: id, goalTitle: title ?? null }
            }
            return prev
        })
    }, [])

    // ─── Today Completed (전체) ───
    const todayCompleted = useMemo(() => {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayStr = todayStart.toISOString()
        return allItems.filter(i =>
            i.status === 'done' && i.completed_at && i.completed_at >= todayStr
        )
    }, [allItems])

    // ─── Goal 추가 인풋 ───
    const [newGoalTitle, setNewGoalTitle] = useState('')
    const [newTaskTitle, setNewTaskTitle] = useState('')

    if (loading || goalsLoading) {
        return (
            <div className="space-y-6">
                <div className="h-10 bg-muted rounded-lg animate-pulse w-64" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-96 bg-muted rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* ═══ 세그먼트 컨트롤 (Track 전환) ═══ */}
            <div className="flex items-center gap-4">
                <div className="flex bg-muted rounded-lg p-1 gap-1">
                    <button
                        type="button"
                        onClick={() => setNav({ track: 'projects', level: 1, selectedParentId: null, selectedGoalId: null, parentTitle: null, goalTitle: null })}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${nav.track === 'projects' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <FolderOpen className="w-4 h-4" />
                        Projects
                    </button>
                    <button
                        type="button"
                        onClick={() => setNav({ track: 'plans', level: 1, selectedParentId: null, selectedGoalId: null, parentTitle: null, goalTitle: null })}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${nav.track === 'plans' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Plans
                    </button>
                </div>

                {/* ─── Breadcrumb ─── */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <button
                        type="button"
                        onClick={() => navigateTo(1)}
                        className="hover:text-foreground cursor-pointer transition-colors"
                    >
                        {nav.track === 'projects' ? 'Projects' : 'Plans'}
                    </button>
                    {nav.parentTitle && (
                        <>
                            <ChevronRight className="w-3 h-3" />
                            <button
                                type="button"
                                onClick={() => navigateTo(2, nav.selectedParentId!, nav.parentTitle!)}
                                className="hover:text-foreground cursor-pointer transition-colors font-medium text-foreground"
                            >
                                {nav.parentTitle}
                            </button>
                        </>
                    )}
                    {nav.goalTitle && (
                        <>
                            <ChevronRight className="w-3 h-3" />
                            <span className="font-medium text-foreground">{nav.goalTitle}</span>
                        </>
                    )}
                </div>
            </div>

            {/* ═══ 3-Tier 탭 ═══ */}
            <div className="flex items-center gap-1 border-b">
                {[
                    { level: 1 as TierLevel, icon: Layers, label: nav.track === 'projects' ? 'Projects' : 'Plans' },
                    { level: 2 as TierLevel, icon: Target, label: 'Goals' },
                    { level: 3 as TierLevel, icon: ListTodo, label: 'Tasks' },
                ].map(tab => {
                    const isActive = nav.level === tab.level
                    const isDisabled = tab.level === 2 && !nav.selectedParentId
                        || tab.level === 3 && !nav.selectedGoalId
                    return (
                        <button
                            key={tab.level}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                                if (tab.level === 1) navigateTo(1)
                                else if (tab.level === 2 && nav.selectedParentId) setNav(p => ({ ...p, level: 2, selectedGoalId: null, goalTitle: null }))
                                else if (tab.level === 3 && nav.selectedGoalId) setNav(p => ({ ...p, level: 3 }))
                            }}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${isActive
                                    ? 'border-primary text-primary'
                                    : isDisabled
                                        ? 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* ═══ Kanban 보드 ═══ */}
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
                {nav.level === 1 && renderLevel1()}
                {nav.level === 2 && renderLevel2()}
                {nav.level === 3 && renderLevel3()}
            </div>

            {/* ═══ Today Completed (Level 1에서만 표시) ═══ */}
            {nav.level === 1 && todayCompleted.length > 0 && (
                <div className="mt-6 border-t pt-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Check className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-semibold">Today Completed</h3>
                        <Badge variant="secondary">{todayCompleted.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {todayCompleted.map(task => (
                            <div key={task.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="text-sm flex-1 line-through text-muted-foreground truncate">{task.title}</span>
                                {task.actual_min != null && (
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{task.actual_min}m</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ Side Panel ═══ */}
            {sidePanelItem && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/30" onClick={() => setSidePanelItemId(null)} />
                    <div className="w-[420px] bg-background border-l shadow-2xl overflow-y-auto p-6 animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">{sidePanelItem.title}</h3>
                            <button type="button" onClick={() => setSidePanelItemId(null)} className="p-1 rounded hover:bg-muted cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 상태 */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
                                <div className="flex gap-2 mt-1.5 flex-wrap">
                                    {(['backlog', 'active', 'blocked', 'done'] as const).map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => void updateItem(sidePanelItem.id, { status: s }).catch(e => alert(e instanceof Error ? e.message : 'Error'))}
                                            className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${sidePanelItem.status === s
                                                    ? s === 'done' ? 'bg-emerald-500 text-white'
                                                        : s === 'active' ? 'bg-blue-500 text-white'
                                                            : s === 'blocked' ? 'bg-red-500 text-white'
                                                                : 'bg-gray-500 text-white'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 시간 정보 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-xs text-muted-foreground">Estimate</div>
                                    <div className="text-lg font-semibold">{sidePanelItem.estimate_min ?? '-'}m</div>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-xs text-muted-foreground">Actual</div>
                                    <div className="text-lg font-semibold">{sidePanelItem.actual_min ?? '-'}m</div>
                                </div>
                            </div>

                            {/* 타임라인 */}
                            {sidePanelItem.started_at && (
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <div>Started: {new Date(sidePanelItem.started_at).toLocaleString('ko-KR')}</div>
                                    {sidePanelItem.completed_at && (
                                        <div>Completed: {new Date(sidePanelItem.completed_at).toLocaleString('ko-KR')}</div>
                                    )}
                                </div>
                            )}

                            {/* 삭제 */}
                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full mt-4"
                                onClick={() => { void removeItem(sidePanelItem.id); setSidePanelItemId(null) }}
                            >
                                Delete Task
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    // ═══════════════════════════════════════
    // Level 1: Projects 또는 Plans 목록
    // ═══════════════════════════════════════
    function renderLevel1() {
        if (nav.track === 'projects') {
            const columns = KANBAN_COLUMNS.level1
            return columns.map(col => {
                const items = projects.filter(p => p.status === col.key)
                return (
                    <div key={col.key} className={`flex-1 min-w-[280px] rounded-xl border ${col.color} ${col.bg}`}>
                        <div className={`${col.headerBg} text-white rounded-t-xl px-4 py-2.5 flex items-center justify-between`}>
                            <span className="text-sm font-semibold">{col.label}</span>
                            <Badge className="bg-white/20 text-white hover:bg-white/30">{items.length}</Badge>
                        </div>
                        <div className="p-3 space-y-2">
                            {items.map(project => {
                                const projectTasks = allItems.filter(i => i.project_id === project.id && !i.deleted_at)
                                const doneTasks = projectTasks.filter(i => i.status === 'done')
                                const doneWeight = doneTasks.reduce((s, i) => s + (i.estimate_min ?? 1), 0)
                                const totalWeight = projectTasks.reduce((s, i) => s + (i.estimate_min ?? 1), 0)
                                const progress = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0
                                return (
                                    <Card
                                        key={project.id}
                                        className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-400"
                                        onClick={() => navigateTo(2, project.id, project.repo_name ?? project.id)}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <span className="font-medium text-sm truncate">{project.repo_name}</span>
                                            </div>
                                            {projectTasks.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Progress value={progress} className="h-1.5 flex-1" />
                                                    <span className="text-xs text-muted-foreground">{doneTasks.length}/{projectTasks.length}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )
                            })}
                            {items.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-8 opacity-50">
                                    No items
                                </div>
                            )}
                        </div>
                    </div>
                )
            })
        }

        // Plans 트랙 — Level 1
        const plansByStatus = {
            active: plans.filter(p => p.status === 'active'),
            done: plans.filter(p => p.status === 'done'),
            deferred: plans.filter(p => p.status === 'deferred'),
        }
        const planColumns = [
            { key: 'active' as const, label: 'Active', color: 'border-blue-400', bg: 'bg-blue-50/30', headerBg: 'bg-blue-500' },
            { key: 'done' as const, label: 'Done', color: 'border-emerald-400', bg: 'bg-emerald-50/30', headerBg: 'bg-emerald-500' },
            { key: 'deferred' as const, label: 'Deferred', color: 'border-gray-300', bg: 'bg-gray-50/20', headerBg: 'bg-gray-400' },
        ]
        return planColumns.map(col => {
            const items = plansByStatus[col.key] || []
            return (
                <div key={col.key} className={`flex-1 min-w-[280px] rounded-xl border ${col.color} ${col.bg}`}>
                    <div className={`${col.headerBg} text-white rounded-t-xl px-4 py-2.5 flex items-center justify-between`}>
                        <span className="text-sm font-semibold">{col.label}</span>
                        <Badge className="bg-white/20 text-white hover:bg-white/30">{items.length}</Badge>
                    </div>
                    <div className="p-3 space-y-2">
                        {items.map(plan => (
                            <Card
                                key={plan.id}
                                className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-400"
                                onClick={() => navigateTo(2, plan.id, plan.title)}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                                        <span className="font-medium text-sm truncate">{plan.title}</span>
                                    </div>
                                    {plan.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{plan.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">{plan.plan_type}</Badge>
                                        {plan.due_at && (
                                            <span className="text-xs text-muted-foreground">{new Date(plan.due_at).toLocaleDateString('ko-KR')}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {items.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8 opacity-50">
                                No items
                            </div>
                        )}
                    </div>
                </div>
            )
        })
    }

    // ═══════════════════════════════════════
    // Level 2: Goals (Project 또는 Plan 하위)
    // ═══════════════════════════════════════
    function renderLevel2() {
        const columns = KANBAN_COLUMNS.level2
        return columns.map(col => {
            const items = goals.filter(g => g.status === col.key)
            return (
                <div key={col.key} className={`flex-1 min-w-[260px] rounded-xl border ${col.color} ${col.bg}`}>
                    <div className={`${col.headerBg} text-white rounded-t-xl px-4 py-2.5 flex items-center justify-between`}>
                        <span className="text-sm font-semibold">{col.label}</span>
                        <Badge className="bg-white/20 text-white hover:bg-white/30">{items.length}</Badge>
                    </div>
                    <div className="p-3 space-y-2">
                        {items.map(goal => {
                            const tasks = allItems.filter(i => i.goal_id === goal.id && !i.deleted_at)
                            const done = tasks.filter(i => i.status === 'done')
                            const doneWeight = done.reduce((s, i) => s + (i.estimate_min ?? 1), 0)
                            const totalWeight = tasks.reduce((s, i) => s + (i.estimate_min ?? 1), 0)
                            const progress = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0
                            return (
                                <Card
                                    key={goal.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow group"
                                    onClick={() => navigateTo(3, goal.id, goal.title)}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Target className="w-4 h-4 text-amber-500 shrink-0" />
                                            <span className="font-medium text-sm truncate flex-1">{goal.title}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); void removeGoal(goal.id) }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                        {tasks.length > 0 && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <Progress value={progress} className="h-1.5 flex-1" />
                                                <span className="text-xs text-muted-foreground">{done.length}/{tasks.length}</span>
                                            </div>
                                        )}
                                        {goal.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{goal.description}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}

                        {/* 새 Goal 추가 (Backlog 컬럼에만) */}
                        {col.key === 'backlog' && (
                            <div className="pt-2">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        if (!newGoalTitle.trim()) return
                                        void addGoal({
                                            title: newGoalTitle.trim(),
                                            ...(nav.track === 'projects'
                                                ? { project_id: nav.selectedParentId }
                                                : { plan_id: nav.selectedParentId }),
                                        })
                                        setNewGoalTitle('')
                                    }}
                                    className="flex gap-1"
                                >
                                    <input
                                        type="text"
                                        value={newGoalTitle}
                                        onChange={e => setNewGoalTitle(e.target.value)}
                                        placeholder="+ New Goal"
                                        className="flex-1 px-2 py-1.5 text-sm bg-white/50 border rounded-md placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <Button type="submit" size="sm" variant="ghost" disabled={!newGoalTitle.trim()}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )
        })
    }

    // ═══════════════════════════════════════
    // Level 3: Tasks (Goal 하위 WorkItems)
    // ═══════════════════════════════════════
    function renderLevel3() {
        const columns = KANBAN_COLUMNS.level3
        return columns.map(col => {
            const items = goalItems.filter(i => i.status === col.key)
            return (
                <div key={col.key} className={`flex-1 min-w-[240px] rounded-xl border ${col.color} ${col.bg}`}>
                    <div className={`${col.headerBg} text-white rounded-t-xl px-4 py-2.5 flex items-center justify-between`}>
                        <span className="text-sm font-semibold">{col.label}</span>
                        <Badge className="bg-white/20 text-white hover:bg-white/30">{items.length}</Badge>
                    </div>
                    <div className="p-3 space-y-2">
                        {items.map(task => (
                            <Card
                                key={task.id}
                                className="cursor-pointer hover:shadow-md transition-shadow group"
                                onClick={() => setSidePanelItemId(task.id)}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2">
                                        {task.status === 'done' ? (
                                            <div className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        ) : task.status === 'blocked' ? (
                                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                        ) : (
                                            <div className="w-4 h-4 rounded border border-muted-foreground/30 shrink-0" />
                                        )}
                                        <span className={`text-sm flex-1 truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                            {task.title}
                                        </span>
                                    </div>
                                    {task.estimate_min && (
                                        <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                            <span>{task.estimate_min}m est</span>
                                            {task.actual_min != null && (
                                                <span className={task.actual_min <= task.estimate_min ? 'text-emerald-600' : 'text-amber-600'}>
                                                    · {task.actual_min}m actual
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        {/* 새 Task 추가 (Backlog 컬럼에만) */}
                        {col.key === 'backlog' && (
                            <div className="pt-2">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        if (!newTaskTitle.trim() || !nav.selectedGoalId) return
                                        void addItem({
                                            title: newTaskTitle.trim(),
                                            goal_id: nav.selectedGoalId,
                                            project_id: nav.track === 'projects' ? nav.selectedParentId : undefined,
                                            status: 'backlog',
                                        })
                                        setNewTaskTitle('')
                                    }}
                                    className="flex gap-1"
                                >
                                    <input
                                        type="text"
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        placeholder="+ New Task"
                                        className="flex-1 px-2 py-1.5 text-sm bg-white/50 border rounded-md placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <Button type="submit" size="sm" variant="ghost" disabled={!newTaskTitle.trim()}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )
        })
    }
}
