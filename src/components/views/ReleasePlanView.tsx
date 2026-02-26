// =========================================
// ReleasePlanView — Release Pipeline
// Active Releases (Plans + Projects) + PointerSensor D&D
// =======================================

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
    DndContext,
    useSensor,
    useSensors,
    PointerSensor,
    useDroppable,
    useDraggable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { useWorkItems } from '../../hooks/useWorkItems'
import { useProjectDeadlines } from '../../hooks/useProjectDeadlines'
import { usePlans } from '../../hooks/usePlans'
import { useProjects } from '../../hooks/useProjects'
import { useGitHub } from '../../hooks/useGitHub'
import { ProjectGitHubPanel } from '../github/ProjectGitHubPanel'
import { ProjectActivityBadge } from '../dashboard/ProjectActivityBadge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import {
    AlertTriangle,
    GitBranch,
    Calendar,
    ListTodo,
    Trash2,
    GripVertical,

    Github,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    Plus,
    X,
    Check,
    ArrowUpRight,
    ArrowDownLeft,
} from 'lucide-react'

// ─── SubTask for Detail Plans ───
interface SubTask {
    id: string
    title: string
    done: boolean
}

interface DetailPlan {
    sub_tasks: SubTask[]
    notes: string
}

const SECTION_ORDER_KEY = 'orchestrator_section_order'

interface DragPayload {
    id: string
    type: 'plan' | 'project'
}

// ─── dnd-kit Draggable 래퍼 ───
function DraggableCard({ id, type, disabled, children, className, onMouseDown, onMouseUp, onClick }: {
    id: string; type: 'plan' | 'project'; disabled?: boolean
    children: React.ReactNode; className?: string
    onMouseDown?: (e: React.MouseEvent) => void
    onMouseUp?: (e: React.MouseEvent) => void
    onClick?: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `${type}-${id}`,
        data: { id, type } as DragPayload,
        disabled,
    })
    const style = transform
        ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 }
        : undefined
    // disabled(삭제 모드)일 때 DndKit listeners를 제거하여 onClick이 정상 작동하도록
    const activeListeners = disabled ? {} : listeners
    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={className}
            {...attributes}
            {...activeListeners}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onClick={onClick}
        >
            {children}
        </Card>
    )
}

// ─── dnd-kit Droppable 래퍼 ───
function DroppableZone({ id, children, className }: {
    id: string; children: React.ReactNode; className?: string
}) {
    const { setNodeRef, isOver } = useDroppable({ id })
    return (
        <div ref={setNodeRef} className={className}>
            {children}
            {isOver && (
                <div className="absolute inset-0 rounded-lg border-2 border-dashed border-primary bg-primary/5 pointer-events-none z-10" />
            )}
        </div>
    )
}

export function ReleasePlanView() {
    const { items: allItems, loading: itemsLoading, updateItem, removeItem } = useWorkItems()
    const { deadlines } = useProjectDeadlines({ upcomingDays: 30 })
    const { plans, loading: plansLoading, deletePlan, updatePlan } = usePlans()
    const { projects, loading: projectsLoading, removeProject, updateProjectStatus } = useProjects()
    const { connection } = useGitHub()
    const githubToken = connection?.access_token ?? null

    const loading = itemsLoading || plansLoading || projectsLoading
    // ─── 인라인 삭제 모드 ───
    const [deleteMode, setDeleteMode] = useState(false)
    const [deleteTargets, setDeleteTargets] = useState<Set<string>>(new Set())
    // ─── Active 카드 접힘 토글 ───
    const [expandedActiveIds, setExpandedActiveIds] = useState<Set<string>>(new Set())
    // ─── Optimistic 드래그 상태 ───
    const [localPlanOverrides, setLocalPlanOverrides] = useState<Record<string, string>>({})
    const [localProjectOverrides, setLocalProjectOverrides] = useState<Record<string, string>>({})

    // ─── Section Order (localStorage 저장) ───
    const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(SECTION_ORDER_KEY)
            return saved ? JSON.parse(saved) : ['plans', 'projects']
        } catch { return ['plans', 'projects'] }
    })


    useEffect(() => {
        localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(sectionOrder))
    }, [sectionOrder])

    // ─── Detail Plan 펼침 state (여러 개 동시 열기) ───
    const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set())

    // ─── 프로젝트 오버레이 ───
    const [overlayProjectId, setOverlayProjectId] = useState<string | null>(null)
    const overlayProject = useMemo(() => projects.find(p => p.id === overlayProjectId), [projects, overlayProjectId])
    const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({})

    // ─── 클릭 vs 드래그 구분 ───
    const mouseDownPos = useRef<{ x: number; y: number } | null>(null)
    const [, setActiveDragId] = useState<string | null>(null)

    const handleCardMouseDown = useCallback((e: React.MouseEvent) => {
        mouseDownPos.current = { x: e.clientX, y: e.clientY }
    }, [])

    const togglePlanExpand = useCallback((planId: string, e: React.MouseEvent) => {
        // 버튼/링크 클릭은 무시
        if ((e.target as HTMLElement).closest('button, a, input')) return
        // 드래그였으면 무시 (8px 이상 이동)
        if (mouseDownPos.current) {
            const dx = Math.abs(e.clientX - mouseDownPos.current.x)
            const dy = Math.abs(e.clientY - mouseDownPos.current.y)
            if (dx > 8 || dy > 8) return
        }
        setExpandedPlanIds(prev => {
            const next = new Set(prev)
            if (next.has(planId)) next.delete(planId)
            else next.add(planId)
            return next
        })
    }, [])

    // ─── dnd-kit PointerSensor (WebView 호환) ───
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 8 },
    })
    const sensors = useSensors(pointerSensor)

    const handleDndStart = useCallback((event: DragStartEvent) => {
        setActiveDragId(event.active.id as string)
    }, [])

    const handleDndEnd = useCallback((event: DragEndEvent) => {
        setActiveDragId(null)
        const { active, over } = event
        if (!over) return

        const payload = active.data.current as DragPayload | undefined
        if (!payload) return

        const { id, type } = payload
        const targetZone = over.id as string

        if (targetZone === 'drop-active') {
            // → Active
            if (type === 'plan') {
                setLocalPlanOverrides(prev => ({ ...prev, [id]: 'active' }))
                void updatePlan(id, { status: 'active' }).finally(() => {
                    setLocalPlanOverrides(prev => { const next = { ...prev }; delete next[id]; return next })
                })
            } else if (type === 'project') {
                setLocalProjectOverrides(prev => ({ ...prev, [id]: 'active' }))
                void updateProjectStatus(id, { status: 'active' }).finally(() => {
                    setLocalProjectOverrides(prev => { const next = { ...prev }; delete next[id]; return next })
                })
            }
        } else if (targetZone === 'drop-backlog') {
            // → Backlog
            if (type === 'plan') {
                setLocalPlanOverrides(prev => ({ ...prev, [id]: 'backlog' }))
                void updatePlan(id, { status: 'backlog' }).finally(() => {
                    setLocalPlanOverrides(prev => { const next = { ...prev }; delete next[id]; return next })
                })
            } else if (type === 'project') {
                setLocalProjectOverrides(prev => ({ ...prev, [id]: 'archived' }))
                void updateProjectStatus(id, { status: 'archived' }).finally(() => {
                    setLocalProjectOverrides(prev => { const next = { ...prev }; delete next[id]; return next })
                })
            }
        }
    }, [updatePlan, updateProjectStatus])

    // ─── 삭제 관리 핸들러 ───
    const handleBulkDelete = useCallback(async () => {
        const targets = Array.from(deleteTargets)
        console.log('[ReleasePlan] handleBulkDelete 시작, 대상:', targets)
        for (const id of targets) {
            // 플랜인지 프로젝트인지 판별
            const matchedPlan = plans.find(p => p.id === id)
            const matchedProject = projects.find(p => p.id === id)
            console.log(`[ReleasePlan] id=${id} → plan=${!!matchedPlan}, project=${!!matchedProject}`)
            if (matchedPlan) {
                console.log('[ReleasePlan] deletePlan 호출:', id)
                await deletePlan(id)
                console.log('[ReleasePlan] deletePlan 완료:', id)
            } else if (matchedProject) {
                console.log('[ReleasePlan] removeProject 호출:', id)
                await removeProject(id)
                console.log('[ReleasePlan] removeProject 완료:', id)
            } else {
                console.warn('[ReleasePlan] 매칭 안 됨:', id)
            }
        }
        setDeleteTargets(new Set())
        setDeleteMode(false)
        console.log('[ReleasePlan] handleBulkDelete 완료')
    }, [deleteTargets, plans, projects, deletePlan, removeProject])

    // ─── Section Order Drag (removed ─ now via button) ───
    const toggleSectionOrder = useCallback(() => {
        setSectionOrder(prev => [...prev].reverse())
    }, [])

    // ─── Derived ───
    // ─── Optimistic 필터링 (plans) ───
    const getEffectivePlanStatus = useCallback((plan: { id: string; status: string }) => {
        return localPlanOverrides[plan.id] ?? plan.status
    }, [localPlanOverrides])

    const getEffectiveProjectStatus = useCallback((project: { id: string; status: string }) => {
        return localProjectOverrides[project.id] ?? project.status
    }, [localProjectOverrides])

    const activePlans = useMemo(() => plans.filter(p => getEffectivePlanStatus(p) === 'active'), [plans, getEffectivePlanStatus])
    const backlogPlans = useMemo(() => plans.filter(p => { const s = getEffectivePlanStatus(p); return s !== 'active' && s !== 'done' }), [plans, getEffectivePlanStatus])
    const donePlans = useMemo(() => plans.filter(p => getEffectivePlanStatus(p) === 'done'), [plans, getEffectivePlanStatus])

    const activeProjects = useMemo(() => projects.filter(p => getEffectiveProjectStatus(p) === 'active'), [projects, getEffectiveProjectStatus])
    const backlogProjects = useMemo(() => projects.filter(p => { const s = getEffectiveProjectStatus(p); return s !== 'active' && s !== 'completed' }), [projects, getEffectiveProjectStatus])
    const doneProjects = useMemo(() => projects.filter(p => getEffectiveProjectStatus(p) === 'completed'), [projects, getEffectiveProjectStatus])

    const activeProgress = useMemo(() => {
        let totalSubTasks = 0
        let doneSubTasks = 0

        activePlans.forEach(p => {
            const meta = p.metadata as Record<string, unknown> | undefined
            const dp = meta?.detail_plan as { sub_tasks?: { done: boolean }[] } | undefined
            const subTasks = dp?.sub_tasks ?? []
            totalSubTasks += subTasks.length
            doneSubTasks += subTasks.filter(t => t.done).length
        })

        activeProjects.forEach(p => {
            const meta = (p as unknown as Record<string, unknown>).metadata as Record<string, unknown> | undefined
            const dp = meta?.detail_plan as { sub_tasks?: { done: boolean }[] } | undefined
            const subTasks = dp?.sub_tasks ?? []
            totalSubTasks += subTasks.length
            doneSubTasks += subTasks.filter(t => t.done).length
        })

        const percent = totalSubTasks > 0 ? Math.round((doneSubTasks / totalSubTasks) * 100) : 0
        return { done: doneSubTasks, total: totalSubTasks, percent }
    }, [activePlans, activeProjects])

    // ─── Today Completed 필터 ───
    const todayStart = useMemo(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d.getTime()
    }, [])

    const completedTodayPlans = useMemo(() =>
        donePlans.filter(p => new Date(p.updated_at).getTime() >= todayStart)
        , [donePlans, todayStart])

    const completedTodayProjects = useMemo(() =>
        doneProjects.filter(p => new Date(p.updated_at).getTime() >= todayStart)
        , [doneProjects, todayStart])



    // ─── Detail Plan Helpers ───
    const getPlanDetailPlan = useCallback((planId: string): DetailPlan => {
        const plan = plans.find(p => p.id === planId)
        const meta = plan?.metadata as Record<string, unknown> | undefined
        const dp = meta?.detail_plan as DetailPlan | undefined
        return dp ?? { sub_tasks: [], notes: '' }
    }, [plans])

    const savePlanDetailPlan = useCallback(async (planId: string, dp: DetailPlan) => {
        const plan = plans.find(p => p.id === planId)
        if (!plan) return
        const meta = { ...(plan.metadata as Record<string, unknown>), detail_plan: dp }
        await updatePlan(planId, { metadata: meta } as Record<string, unknown>)
    }, [plans, updatePlan])

    // ─── Project Detail Plan Helpers ───
    const getProjectDetailPlan = useCallback((projectId: string): DetailPlan => {
        const project = projects.find(p => p.id === projectId)
        const meta = (project as unknown as Record<string, unknown>)?.metadata as Record<string, unknown> | undefined
        const dp = meta?.detail_plan as DetailPlan | undefined
        return dp ?? { sub_tasks: [], notes: '' }
    }, [projects])

    const saveProjectDetailPlan = useCallback(async (projectId: string, dp: DetailPlan) => {
        const project = projects.find(p => p.id === projectId)
        if (!project) return
        const meta = { ...((project as unknown as Record<string, unknown>).metadata as Record<string, unknown> ?? {}), detail_plan: dp }
        await updateProjectStatus(projectId, { metadata: meta } as Record<string, unknown>)
    }, [projects, updateProjectStatus])

    const getEntityDetailPlan = useCallback((entityId: string, entityType: 'plan' | 'project'): DetailPlan => {
        return entityType === 'plan' ? getPlanDetailPlan(entityId) : getProjectDetailPlan(entityId)
    }, [getPlanDetailPlan, getProjectDetailPlan])

    const saveEntityDetailPlan = useCallback(async (entityId: string, entityType: 'plan' | 'project', dp: DetailPlan) => {
        if (entityType === 'plan') await savePlanDetailPlan(entityId, dp)
        else await saveProjectDetailPlan(entityId, dp)
    }, [savePlanDetailPlan, saveProjectDetailPlan])

    const addSubTask = useCallback(async (entityId: string, entityType: 'plan' | 'project') => {
        const text = (subTaskInputs[entityId] ?? '').trim()
        if (!text) return
        const newTask: SubTask = { id: crypto.randomUUID(), title: text, done: false }
        const dp = getEntityDetailPlan(entityId, entityType)
        dp.sub_tasks.push(newTask)
        await saveEntityDetailPlan(entityId, entityType, dp)
        setSubTaskInputs(prev => ({ ...prev, [entityId]: '' }))
    }, [subTaskInputs, getEntityDetailPlan, saveEntityDetailPlan])

    const toggleSubTask = useCallback(async (entityId: string, taskId: string, entityType: 'plan' | 'project') => {
        const dp = getEntityDetailPlan(entityId, entityType)
        dp.sub_tasks = dp.sub_tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
        await saveEntityDetailPlan(entityId, entityType, dp)
    }, [getEntityDetailPlan, saveEntityDetailPlan])

    const removeSubTask = useCallback(async (entityId: string, taskId: string, entityType: 'plan' | 'project') => {
        const dp = getEntityDetailPlan(entityId, entityType)
        dp.sub_tasks = dp.sub_tasks.filter(t => t.id !== taskId)
        await saveEntityDetailPlan(entityId, entityType, dp)
    }, [getEntityDetailPlan, saveEntityDetailPlan])

    // ─── Active 카드 토글 ───
    const toggleActiveExpand = useCallback((id: string, e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a, input')) return
        if (mouseDownPos.current) {
            const dx = Math.abs(e.clientX - mouseDownPos.current.x)
            const dy = Math.abs(e.clientY - mouseDownPos.current.y)
            if (dx > 5 || dy > 5) return
        }
        setExpandedActiveIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-muted rounded animate-pulse w-64" />
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    // ─── Detail Panel (공유) ───
    const renderDetailPanel = (entityId: string, entityType: 'plan' | 'project') => {
        const dp = getEntityDetailPlan(entityId, entityType)
        const doneCount = dp.sub_tasks.filter(t => t.done).length
        const progress = dp.sub_tasks.length > 0 ? Math.round((doneCount / dp.sub_tasks.length) * 100) : 0

        return (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                {/* Progress */}
                {dp.sub_tasks.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-2 flex-1 [&>div]:transition-all [&>div]:duration-500 [&>div]:ease-out" />
                        <span className="text-xs text-muted-foreground">{doneCount}/{dp.sub_tasks.length}</span>
                    </div>
                )}

                {/* Sub Tasks */}
                <div className="space-y-1">
                    {dp.sub_tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2 group">
                            <button
                                type="button"
                                onClick={() => void toggleSubTask(entityId, task.id, entityType)}
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${task.done
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-muted-foreground/30 hover:border-primary'
                                    }`}
                            >
                                {task.done && <Check className="w-3 h-3" />}
                            </button>
                            <span className={`text-sm flex-1 ${task.done ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                            </span>
                            <button
                                type="button"
                                onClick={() => void removeSubTask(entityId, task.id, entityType)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add Sub Task */}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={subTaskInputs[entityId] ?? ''}
                        onChange={(e) => setSubTaskInputs(prev => ({ ...prev, [entityId]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && void addSubTask(entityId, entityType)}
                        placeholder="서브태스크 추가..."
                        className="flex-1 text-sm px-2 py-1 rounded border border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => void addSubTask(entityId, entityType)}
                        disabled={!(subTaskInputs[entityId] ?? '').trim()}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        )
    }

    // ─── Plans Section ───
    const renderPlansSection = () => (
        <div className="transition-opacity">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 select-none">
                Plans ({backlogPlans.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {backlogPlans.length === 0 ? (
                    <Card className="sm:col-span-2">
                        <CardContent className="p-6 text-center text-muted-foreground">
                            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No plans yet. Create a plan from Dashboard.</p>
                        </CardContent>
                    </Card>
                ) : (
                    backlogPlans.map(plan => {
                        const PlanIcon = plan.plan_type === 'event' ? Calendar
                            : plan.plan_type === 'project' ? GitBranch
                                : ListTodo
                        const statusColor = plan.status === 'done' ? 'bg-green-500'
                            : plan.status === 'candidate' ? 'bg-yellow-500'
                                : 'bg-gray-400'
                        const isExpanded = expandedPlanIds.has(plan.id)

                        return (
                            <DraggableCard
                                key={plan.id}
                                id={plan.id}
                                type="plan"
                                disabled={deleteMode}
                                onMouseDown={handleCardMouseDown}
                                onMouseUp={(e) => deleteMode ? undefined : togglePlanExpand(plan.id, e)}
                                onClick={() => deleteMode && setDeleteTargets(prev => {
                                    const next = new Set(prev)
                                    if (next.has(plan.id)) next.delete(plan.id)
                                    else next.add(plan.id)
                                    return next
                                })}
                                className={`transition-all ${deleteMode ? 'cursor-pointer' : 'cursor-pointer hover:shadow-sm'} ${deleteMode && deleteTargets.has(plan.id) ? 'ring-2 ring-destructive scale-[0.97] opacity-60' : ''}`}
                            >
                                <CardContent className="p-4 relative">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <div className={`w-3 h-3 rounded-full ${statusColor} shrink-0`} />
                                        <PlanIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-sm line-clamp-2">
                                                {plan.title}
                                            </div>
                                            {plan.due_at && (
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    Due: {new Date(plan.due_at).toLocaleDateString('ko-KR')}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <Badge variant="outline" className="text-xs capitalize">{plan.plan_type}</Badge>
                                                <Badge variant="outline" className="text-xs capitalize">{plan.status}</Badge>
                                                {plan.priority && (
                                                    <Badge
                                                        variant={plan.priority === 'critical' ? 'destructive' : 'outline'}
                                                        className="text-xs"
                                                    >
                                                        {plan.priority}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1">
                                            {!deleteMode && (
                                                <button
                                                    type="button"
                                                    title="Active로 이동"
                                                    onClick={(e) => { e.stopPropagation(); void updatePlan(plan.id, { status: 'active' }) }}
                                                    className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-muted-foreground hover:text-blue-600 transition-colors"
                                                >
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </button>
                                            )}
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                        </div>
                                    </div>
                                    {isExpanded && !deleteMode && renderDetailPanel(plan.id, 'plan')}
                                    {deleteMode && deleteTargets.has(plan.id) && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </CardContent>
                            </DraggableCard>
                        )
                    })
                )}
            </div>
        </div>
    )

    const renderProjectsSection = () => (
        <div className="transition-opacity">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 select-none">
                Projects ({backlogProjects.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {backlogProjects.length === 0 ? (
                    <Card className="sm:col-span-2">
                        <CardContent className="p-6 text-center text-muted-foreground">
                            <Github className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No projects. Import from Dashboard.</p>
                        </CardContent>
                    </Card>
                ) : (
                    backlogProjects.map(project => {

                        return (
                            <DraggableCard
                                key={project.id}
                                id={project.id}
                                type="project"
                                disabled={deleteMode}
                                onMouseDown={handleCardMouseDown}
                                onMouseUp={(e) => deleteMode ? undefined : (() => { if ((e.target as HTMLElement).closest('button, a, input, select')) return; if (mouseDownPos.current) { const dx = Math.abs(e.clientX - mouseDownPos.current.x); const dy = Math.abs(e.clientY - mouseDownPos.current.y); if (dx > 8 || dy > 8) return; } setOverlayProjectId(project.id) })()}
                                onClick={() => deleteMode && setDeleteTargets(prev => {
                                    const next = new Set(prev)
                                    if (next.has(project.id)) next.delete(project.id)
                                    else next.add(project.id)
                                    return next
                                })}
                                className={`transition-all ${deleteMode ? 'cursor-pointer' : 'cursor-pointer hover:shadow-sm'} ${deleteMode && deleteTargets.has(project.id) ? 'ring-2 ring-destructive scale-[0.97] opacity-60' : ''}`}
                            >
                                <CardContent className="p-4 relative">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Github className="w-5 h-5 text-muted-foreground shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-sm flex items-center gap-1 flex-wrap">
                                                <span className="text-muted-foreground">{project.repo_full_name.split('/')[0]}/</span>
                                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }} className="dark:!bg-[#7f1d1d33] dark:!text-[#fca5a5]">{project.repo_full_name.split('/')[1]}</span>
                                            </div>
                                            {project.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{project.description}</p>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                {project.language && (
                                                    <Badge variant="outline" className="text-xs">{project.language}</Badge>
                                                )}
                                                <Badge variant="outline" className="text-xs">{project.default_branch}</Badge>
                                                {project.is_private && (
                                                    <Badge variant="outline" className="text-xs text-yellow-600">private</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </div>
                                    {deleteMode && deleteTargets.has(project.id) && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}

                                </CardContent>
                            </DraggableCard>
                        )
                    })
                )}
            </div>
        </div>
    )

    const sectionRenderers: Record<string, () => React.JSX.Element> = {
        plans: renderPlansSection,
        projects: renderProjectsSection,
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDndStart} onDragEnd={handleDndEnd}>
            <div className="flex gap-6 h-full">
                {/* ═══ 왼쪽: Plans & Projects ═══ */}
                <DroppableZone
                    id="drop-backlog"
                    className="w-1/2 shrink-0 overflow-y-auto space-y-6 pr-4 border-r scrollbar-hide rounded-lg transition-all relative"
                >
                    {sectionOrder.map(sectionId => sectionRenderers[sectionId]?.())}

                    {/* 삭제 모드 버튼 */}
                    <div className="pt-2 pb-4 space-y-2">
                        {/* 순서 변경 버튼 */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={toggleSectionOrder}
                        >
                            <GripVertical className="w-4 h-4 mr-2" />
                            Swap Order ({sectionOrder[0] === 'plans' ? 'Plans → Projects' : 'Projects → Plans'})
                        </Button>

                        {/* 삭제 모드 */}
                        {!deleteMode ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-muted-foreground hover:text-destructive hover:border-destructive/50"
                                onClick={() => { setDeleteMode(true); setDeleteTargets(new Set()) }}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => { setDeleteMode(false); setDeleteTargets(new Set()) }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1"
                                    disabled={deleteTargets.size === 0}
                                    onClick={() => void handleBulkDelete()}
                                >
                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                    Delete ({deleteTargets.size})
                                </Button>
                            </div>
                        )}
                    </div>
                </DroppableZone>

                {/* ═══ 오른쪽: Active Releases + Today + Deadlines ═══ */}
                <div className="w-1/2 overflow-y-auto space-y-6 scrollbar-hide">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold">Release Plan</h2>
                            <p className="text-muted-foreground">Continuous development with intelligent orchestration</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold">{activeProgress.percent}%</div>
                            <div className="text-sm text-muted-foreground">
                                Active Progress · {activeProgress.done}/{activeProgress.total}
                            </div>
                        </div>
                    </div>

                    <Progress value={activeProgress.percent} className="h-3" />

                    {/* Active Releases — Drop Zone */}
                    <DroppableZone id="drop-active" className="relative">
                        <h3 className="text-lg font-medium mb-4">Active Releases</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2 rounded-lg border-2 border-dashed border-transparent transition-all">
                            {/* Work Items 기반 릴리스 그룹 - 이제 개별 Project 카드 내부로 이동됨 */}

                            {/* Active Plans — 서브태스크 인라인 표시 (접힘 토글) */}
                            {activePlans.map(plan => {
                                const PlanIcon = plan.plan_type === 'event' ? Calendar
                                    : plan.plan_type === 'project' ? GitBranch
                                        : ListTodo
                                const dp = getPlanDetailPlan(plan.id)
                                const activeTasks = dp.sub_tasks.filter(t => !t.done)
                                const doneTasks = dp.sub_tasks.filter(t => t.done)
                                const progress = dp.sub_tasks.length > 0 ? Math.round((doneTasks.length / dp.sub_tasks.length) * 100) : 0
                                const isExpanded = expandedActiveIds.has(plan.id)
                                return (
                                    <DraggableCard
                                        key={plan.id}
                                        id={plan.id}
                                        type="plan"
                                        className="border-blue-200 bg-blue-50/30 cursor-pointer"
                                        onMouseDown={handleCardMouseDown}
                                        onMouseUp={(e) => toggleActiveExpand(plan.id, e)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                                                <PlanIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-sm line-clamp-2">
                                                        {plan.title}
                                                    </div>
                                                    {plan.due_at && (
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            Due: {new Date(plan.due_at).toLocaleDateString('ko-KR')}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        <Badge variant="outline" className="text-xs capitalize">{plan.plan_type}</Badge>
                                                        <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Active</Badge>
                                                        {plan.priority && (
                                                            <Badge variant={plan.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                                                                {plan.priority}
                                                            </Badge>
                                                        )}
                                                        {dp.sub_tasks.length > 0 && (
                                                            <span className="text-xs text-muted-foreground">{doneTasks.length}/{dp.sub_tasks.length}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        title="Backlog으로 이동"
                                                        onClick={(e) => { e.stopPropagation(); void updatePlan(plan.id, { status: 'backlog' }) }}
                                                        className="p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-muted-foreground hover:text-orange-600 transition-colors"
                                                    >
                                                        <ArrowDownLeft className="w-4 h-4" />
                                                    </button>
                                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                </div>
                                            </div>

                                            {/* 접힘 시 progress bar만 */}
                                            {!isExpanded && dp.sub_tasks.length > 0 && (
                                                <div className="mt-3">
                                                    <Progress value={progress} className="h-2" />
                                                </div>
                                            )}

                                            {/* 펼침 시 상세 */}
                                            {isExpanded && (
                                                <>
                                                    {dp.sub_tasks.length > 0 && (
                                                        <div className="mt-4 space-y-3">
                                                            <div className="flex items-center gap-2">
                                                                <Progress value={progress} className="h-2 flex-1" />
                                                                <span className="text-xs text-muted-foreground font-medium">{doneTasks.length}/{dp.sub_tasks.length}</span>
                                                            </div>
                                                            {activeTasks.length > 0 && (
                                                                <div className="space-y-1">
                                                                    {activeTasks.map(task => (
                                                                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md bg-white/60 group">
                                                                            <button type="button" onClick={() => void toggleSubTask(plan.id, task.id, 'plan')} className="w-4 h-4 rounded border border-muted-foreground/30 hover:border-primary flex items-center justify-center shrink-0 cursor-pointer transition-colors" />
                                                                            <span className="text-sm flex-1">{task.title}</span>
                                                                            <button type="button" onClick={() => void removeSubTask(plan.id, task.id, 'plan')} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"><X className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {doneTasks.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</div>
                                                                    {doneTasks.map(task => (
                                                                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md bg-green-50/50 group">
                                                                            <button type="button" onClick={() => void toggleSubTask(plan.id, task.id, 'plan')} className="w-4 h-4 rounded bg-green-500 border-green-500 text-white flex items-center justify-center shrink-0 cursor-pointer"><Check className="w-3 h-3" /></button>
                                                                            <span className="text-sm flex-1 line-through text-muted-foreground">{task.title}</span>
                                                                            <button type="button" onClick={() => void removeSubTask(plan.id, task.id, 'plan')} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"><X className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <input type="text" value={subTaskInputs[plan.id] ?? ''} onChange={(e) => setSubTaskInputs(prev => ({ ...prev, [plan.id]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && void addSubTask(plan.id, 'plan')} placeholder="서브태스크 추가..." className="flex-1 text-sm px-3 py-1.5 rounded border border-border bg-white/80 focus:outline-none focus:ring-1 focus:ring-primary" />
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => void addSubTask(plan.id, 'plan')} disabled={!(subTaskInputs[plan.id] ?? '').trim()}><Plus className="w-4 h-4" /></Button>
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </DraggableCard>
                                )
                            })}

                            {/* Active Projects — 접힘 토글 + 서브태스크 */}
                            {activeProjects.map(project => {
                                const projectItems = allItems.filter(i => i.project_id === project.id)
                                const projectActiveTasks = projectItems.filter(i => i.status !== 'done')
                                const projectDoneTasks = projectItems.filter(i => i.status === 'done')
                                const doneWeight = projectDoneTasks.reduce((s, i) => s + (i.estimate_min ?? 1), 0)
                                const totalWeight = projectItems.reduce((s, i) => s + (i.estimate_min ?? 1), 0)
                                const wiProgress = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0
                                // metadata 기반 서브태스크
                                const pdp = getProjectDetailPlan(project.id)
                                const pdpDone = pdp.sub_tasks.filter(t => t.done)
                                const pdpActive = pdp.sub_tasks.filter(t => !t.done)
                                const totalTaskCount = projectItems.length + pdp.sub_tasks.length
                                const isExpanded = expandedActiveIds.has(project.id)

                                return (
                                    <DraggableCard
                                        key={project.id}
                                        id={project.id}
                                        type="project"
                                        className="border-green-200 bg-green-50/30 cursor-pointer"
                                        onMouseDown={handleCardMouseDown}
                                        onMouseUp={(e) => toggleActiveExpand(project.id, e)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                                                <Github className="w-4 h-4 text-green-600 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-sm flex items-center gap-1 flex-wrap">
                                                        <span className="text-muted-foreground">{project.repo_full_name.split('/')[0]}/</span>
                                                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }} className="dark:!bg-[#7f1d1d33] dark:!text-[#fca5a5]">{project.repo_full_name.split('/')[1]}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        {project.language && <Badge variant="outline" className="text-xs">{project.language}</Badge>}
                                                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Active</Badge>
                                                        {totalTaskCount > 0 && (
                                                            <span className="text-xs text-muted-foreground">{projectDoneTasks.length + pdpDone.length}/{totalTaskCount}</span>
                                                        )}
                                                    </div>
                                                    <ProjectActivityBadge repoFullName={project.repo_full_name} />
                                                </div>
                                                <div className="shrink-0">
                                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                </div>
                                            </div>

                                            {/* 접힘 시 progress bar만 */}
                                            {!isExpanded && totalTaskCount > 0 && (
                                                <div className="mt-3">
                                                    <Progress value={wiProgress} className="h-2" />
                                                </div>
                                            )}

                                            {/* 펼침 시 상세 */}
                                            {isExpanded && (
                                                <div className="mt-4 space-y-3">
                                                    {/* Work Items (Orchestration에서 추가된 것) */}
                                                    {projectItems.length > 0 && (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <Progress value={wiProgress} className="h-2 flex-1" />
                                                                <span className="text-xs text-muted-foreground font-medium">{projectDoneTasks.length}/{projectItems.length} items</span>
                                                            </div>
                                                            {projectActiveTasks.filter(t => t.status !== 'blocked').length > 0 && (
                                                                <div className="space-y-1">
                                                                    {projectActiveTasks.filter(t => t.status !== 'blocked').map(task => (
                                                                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md bg-white/60 group">
                                                                            <button type="button" onClick={() => void updateItem(task.id, { status: 'done' })} className="w-4 h-4 rounded border border-muted-foreground/30 hover:border-primary flex items-center justify-center shrink-0 cursor-pointer transition-colors" />
                                                                            <div className="flex flex-col flex-1"><span className="text-sm">{task.title}</span>{task.next_action && <span className="text-xs text-muted-foreground">{task.next_action}</span>}</div>
                                                                            <button type="button" onClick={() => void updateItem(task.id, { status: 'blocked' }).catch(e => alert(e instanceof Error ? e.message : 'Error'))} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 transition-opacity cursor-pointer" title="차단 표시"><AlertTriangle className="w-3 h-3" /></button>
                                                                            <button type="button" onClick={() => void removeItem(task.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"><X className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {projectActiveTasks.filter(t => t.status === 'blocked').length > 0 && (
                                                                <div className="space-y-1">
                                                                    <div className="text-xs font-medium text-red-500 uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Blocked</div>
                                                                    {projectActiveTasks.filter(t => t.status === 'blocked').map(task => (
                                                                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md bg-red-50/50 group">
                                                                            <button type="button" onClick={() => void updateItem(task.id, { status: 'active' })} className="w-4 h-4 rounded border-2 border-red-400 text-red-500 flex items-center justify-center shrink-0 cursor-pointer hover:bg-red-100 transition-colors" title="차단 해제"><AlertTriangle className="w-2.5 h-2.5" /></button>
                                                                            <div className="flex flex-col flex-1"><span className="text-sm text-red-700">{task.title}</span>{task.next_action && <span className="text-xs text-red-400">{task.next_action}</span>}</div>
                                                                            <button type="button" onClick={() => void removeItem(task.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"><X className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {projectDoneTasks.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed (Items)</div>
                                                                    {projectDoneTasks.map(task => (
                                                                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md bg-green-50/50 group">
                                                                            <button type="button" onClick={() => void updateItem(task.id, { status: 'backlog' })} className="w-4 h-4 rounded bg-green-500 border-green-500 text-white flex items-center justify-center shrink-0 cursor-pointer"><Check className="w-3 h-3" /></button>
                                                                            <span className="text-sm flex-1 line-through text-muted-foreground">{task.title}</span>
                                                                            <button type="button" onClick={() => void removeItem(task.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"><X className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* metadata 기반 서브태스크 (수동 추가) */}
                                                    {pdp.sub_tasks.length > 0 && (
                                                        <>
                                                            {projectItems.length > 0 && <div className="border-t border-border/50 pt-2"><div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Sub Tasks</div></div>}
                                                            {pdpActive.map(task => (
                                                                <div key={task.id} className="flex items-center gap-2 p-2 rounded-md bg-white/60 group">
                                                                    <button type="button" onClick={() => void toggleSubTask(project.id, task.id, 'project')} className="w-4 h-4 rounded border border-muted-foreground/30 hover:border-primary flex items-center justify-center shrink-0 cursor-pointer transition-colors" />
                                                                    <span className="text-sm flex-1">{task.title}</span>
                                                                    <button type="button" onClick={() => void removeSubTask(project.id, task.id, 'project')} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"><X className="w-3 h-3" /></button>
                                                                </div>
                                                            ))}
                                                            {pdpDone.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed (Sub)</div>
                                                                    {pdpDone.map(task => (
                                                                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md bg-green-50/50 group">
                                                                            <button type="button" onClick={() => void toggleSubTask(project.id, task.id, 'project')} className="w-4 h-4 rounded bg-green-500 border-green-500 text-white flex items-center justify-center shrink-0 cursor-pointer"><Check className="w-3 h-3" /></button>
                                                                            <span className="text-sm flex-1 line-through text-muted-foreground">{task.title}</span>
                                                                            <button type="button" onClick={() => void removeSubTask(project.id, task.id, 'project')} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"><X className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* 서브태스크 추가 (수동) */}
                                                    <div className="flex items-center gap-2">
                                                        <input type="text" value={subTaskInputs[project.id] ?? ''} onChange={(e) => setSubTaskInputs(prev => ({ ...prev, [project.id]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && void addSubTask(project.id, 'project')} placeholder="서브태스크 추가..." className="flex-1 text-sm px-3 py-1.5 rounded border border-border bg-white/80 focus:outline-none focus:ring-1 focus:ring-primary" />
                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => void addSubTask(project.id, 'project')} disabled={!(subTaskInputs[project.id] ?? '').trim()}><Plus className="w-4 h-4" /></Button>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </DraggableCard>
                                )
                            })}

                            {activePlans.length === 0 && activeProjects.length === 0 && (
                                <Card className="col-span-full">
                                    <CardContent className="p-6 text-center text-muted-foreground">
                                        <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>No active releases. Drag a plan or project here to activate.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </DroppableZone>

                    {/* ─── Today Completed ─── */}
                    {(() => {
                        const todayStart = new Date()
                        todayStart.setHours(0, 0, 0, 0)
                        const todayStr = todayStart.toISOString()
                        const todayCompleted = allItems.filter(i =>
                            i.status === 'done' &&
                            i.completed_at &&
                            i.completed_at >= todayStr
                        )
                        if (todayCompleted.length === 0) return null
                        return (
                            <div className="mt-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Check className="w-5 h-5 text-emerald-500" />
                                    <h3 className="text-lg font-semibold">Today Completed</h3>
                                    <Badge variant="secondary">{todayCompleted.length}</Badge>
                                </div>
                                <div className="space-y-2">
                                    {todayCompleted.map(task => (
                                        <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                                            <div className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm flex-1 line-through text-muted-foreground">{task.title}</span>
                                            {task.actual_min != null && (
                                                <span className="text-xs text-muted-foreground">
                                                    {task.actual_min}m
                                                    {task.estimate_min != null && (
                                                        <span className={task.actual_min <= task.estimate_min ? ' text-emerald-600' : ' text-amber-600'}>
                                                            {' '}({task.estimate_min}m est)
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })()}



                    {/* ─── 구분선: Today Completed ─── */}
                    {
                        (completedTodayPlans.length > 0 || completedTodayProjects.length > 0) && (
                            <>
                                <div className="relative my-8">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-3 text-muted-foreground font-medium tracking-wider">Today Completed</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {completedTodayPlans.map(plan => {
                                        const dp = getPlanDetailPlan(plan.id)
                                        const doneCount = dp.sub_tasks.filter(t => t.done).length
                                        return (
                                            <Card key={plan.id} className="border-green-200 bg-green-50/20 opacity-80">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Check className="w-5 h-5 text-green-600 shrink-0" />
                                                            <div>
                                                                <div className="font-medium text-sm">{plan.title}</div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Badge variant="outline" className="text-xs capitalize">{plan.plan_type}</Badge>
                                                                    <Badge className="text-xs bg-green-100 text-green-700 border-green-200">completed</Badge>
                                                                    {dp.sub_tasks.length > 0 && (
                                                                        <span className="text-xs text-muted-foreground">{doneCount}/{dp.sub_tasks.length} tasks</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(plan.updated_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}

                                    {completedTodayProjects.map(project => (
                                        <Card key={project.id} className="border-green-200 bg-green-50/20 opacity-80">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Check className="w-5 h-5 text-green-600 shrink-0" />
                                                        <div>
                                                            <div className="font-medium text-sm flex items-center gap-1">
                                                                <span className="text-muted-foreground">{project.repo_full_name.split('/')[0]}/</span>
                                                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }} className="dark:!bg-[#7f1d1d33] dark:!text-[#fca5a5]">{project.repo_full_name.split('/')[1]}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {project.language && <Badge variant="outline" className="text-xs">{project.language}</Badge>}
                                                                <Badge className="text-xs bg-green-100 text-green-700 border-green-200">completed</Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(project.updated_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        )
                    }

                    {/* Upcoming Deadlines */}
                    {
                        deadlines.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                                        Upcoming Deadlines
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {deadlines.map(d => (
                                            <div key={d.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                                                <span className="text-sm font-medium">{d.milestone}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{new Date(d.deadline_at).toLocaleDateString()}</Badge>
                                                    <Badge variant={d.risk_score > 70 ? 'destructive' : 'outline'}>
                                                        Risk: {d.risk_score}%
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    }
                </div>

                {/* ═══ 프로젝트 오버레이 ═══ */}
                {
                    overlayProject && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300"
                            style={{ animation: 'fadeIn 200ms ease-out' }}
                        >
                            {/* Backdrop */}
                            <div
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                onClick={() => setOverlayProjectId(null)}
                            />
                            {/* Panel */}
                            <div
                                className="relative bg-background rounded-xl shadow-2xl border w-[700px] max-h-[80vh] overflow-y-auto"
                                style={{ animation: 'slideUp 250ms ease-out' }}
                            >
                                <div className="sticky top-0 bg-background z-10 flex items-center justify-between p-5 border-b">
                                    <div className="flex items-center gap-3">
                                        <Github className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <div className="font-semibold flex items-center gap-1">
                                                <span className="text-muted-foreground">{overlayProject.repo_full_name.split('/')[0]}/</span>
                                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }} className="dark:!bg-[#7f1d1d33] dark:!text-[#fca5a5]">{overlayProject.repo_full_name.split('/')[1]}</span>
                                            </div>
                                            {overlayProject.description && (
                                                <p className="text-sm text-muted-foreground mt-0.5">{overlayProject.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={overlayProject.repo_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setOverlayProjectId(null)}
                                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <ProjectGitHubPanel
                                        repoFullName={overlayProject.repo_full_name}
                                        token={githubToken}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* CSS Animations */}
                <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            </div>
        </DndContext>
    )
}
