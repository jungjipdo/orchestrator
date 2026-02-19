// ============================================
// ReleasePlanView — Release Pipeline
// Active Releases (Plans + Projects) + 섹션 순서 드래그
// ============================================

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useWorkItems } from '../../hooks/useWorkItems'
import { useProjectDeadlines } from '../../hooks/useProjectDeadlines'
import { usePlans } from '../../hooks/usePlans'
import { useProjects } from '../../hooks/useProjects'
import { useGitHub } from '../../hooks/useGitHub'
import { ProjectGitHubPanel } from '../github/ProjectGitHubPanel'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import type { WorkItemRow } from '../../types/database'
import {
    AlertTriangle,
    Users,
    GitBranch,
    Calendar,
    ListTodo,
    Trash2,
    GripVertical,
    ArrowLeft,
    Github,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    Plus,
    X,
    Check,
} from 'lucide-react'

// ─── Release 그룹 ───
interface ReleaseGroup {
    projectId: string | null
    projectName: string
    items: WorkItemRow[]
    doneCount: number
    totalCount: number
    progress: number
    criticalCount: number
    latestUpdate: string
}

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

export function ReleasePlanView() {
    const { items: allItems, loading: itemsLoading } = useWorkItems()
    const { deadlines } = useProjectDeadlines({ upcomingDays: 30 })
    const { plans, loading: plansLoading, deletePlan, updatePlan } = usePlans()
    const { projects, loading: projectsLoading, removeProject, updateProjectStatus } = useProjects()
    const { connection } = useGitHub()
    const githubToken = connection?.access_token ?? null

    const loading = itemsLoading || plansLoading || projectsLoading
    const [dragOverActive, setDragOverActive] = useState(false)

    // ─── Section Order (localStorage 저장) ───
    const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(SECTION_ORDER_KEY)
            return saved ? JSON.parse(saved) : ['plans', 'projects']
        } catch { return ['plans', 'projects'] }
    })
    const [, setDraggedSection] = useState<string | null>(null)

    useEffect(() => {
        localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(sectionOrder))
    }, [sectionOrder])

    // ─── Detail Plan 펼침 state (여러 개 동시 열기) ───
    const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set())
    const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set())
    const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({})

    // ─── 클릭 vs 드래그 구분 ───
    const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

    const handleCardMouseDown = useCallback((e: React.MouseEvent) => {
        mouseDownPos.current = { x: e.clientX, y: e.clientY }
    }, [])

    const togglePlanExpand = useCallback((planId: string, e: React.MouseEvent) => {
        // 버튼/링크 클릭은 무시
        if ((e.target as HTMLElement).closest('button, a, input')) return
        // 드래그였으면 무시 (5px 이상 이동)
        if (mouseDownPos.current) {
            const dx = Math.abs(e.clientX - mouseDownPos.current.x)
            const dy = Math.abs(e.clientY - mouseDownPos.current.y)
            if (dx > 5 || dy > 5) return
        }
        setExpandedPlanIds(prev => {
            const next = new Set(prev)
            if (next.has(planId)) next.delete(planId)
            else next.add(planId)
            return next
        })
    }, [])

    const toggleProjectExpand = useCallback((projectId: string, e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a, input, select')) return
        if (mouseDownPos.current) {
            const dx = Math.abs(e.clientX - mouseDownPos.current.x)
            const dy = Math.abs(e.clientY - mouseDownPos.current.y)
            if (dx > 5 || dy > 5) return
        }
        setExpandedProjectIds(prev => {
            const next = new Set(prev)
            if (next.has(projectId)) next.delete(projectId)
            else next.add(projectId)
            return next
        })
    }, [])

    // ─── Drag & Drop Handlers (Plans → Active) ───
    const handleDragStart = useCallback((e: React.DragEvent, id: string, type: 'plan' | 'project') => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }))
        e.dataTransfer.effectAllowed = 'move'
    }, [])

    const handleDragEnd = useCallback(() => {
        setDragOverActive(false)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOverActive(true)
    }, [])

    const handleDragLeave = useCallback(() => {
        setDragOverActive(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOverActive(false)
        try {
            const raw = e.dataTransfer.getData('text/plain')
            const { id, type } = JSON.parse(raw) as { id: string; type: 'plan' | 'project' }
            // Optimistic: fire-and-forget (UI는 refresh에서 갱신)
            if (type === 'plan') {
                void updatePlan(id, { status: 'active' })
            } else if (type === 'project') {
                void updateProjectStatus(id, { status: 'active' })
            }
        } catch (err) {
            console.error('Failed to activate:', err)
        }
    }, [updatePlan, updateProjectStatus])

    // ─── Section Order Drag ───
    const handleSectionDragStart = useCallback((e: React.DragEvent, sectionId: string) => {
        e.dataTransfer.setData('section', sectionId)
        setDraggedSection(sectionId)
    }, [])

    const handleSectionDrop = useCallback((e: React.DragEvent, targetSection: string) => {
        e.preventDefault()
        const sourceSection = e.dataTransfer.getData('section')
        if (sourceSection && sourceSection !== targetSection) {
            setSectionOrder(prev => {
                const newOrder = [...prev]
                const srcIdx = newOrder.indexOf(sourceSection)
                const tgtIdx = newOrder.indexOf(targetSection)
                if (srcIdx !== -1 && tgtIdx !== -1) {
                    newOrder.splice(srcIdx, 1)
                    newOrder.splice(tgtIdx, 0, sourceSection)
                }
                return newOrder
            })
        }
        setDraggedSection(null)
    }, [])

    // ─── Derived ───
    const releaseGroups = useMemo<ReleaseGroup[]>(() => {
        const grouped = new Map<string | null, WorkItemRow[]>()
        allItems.forEach(item => {
            const key = item.project_id ?? null
            if (!grouped.has(key)) grouped.set(key, [])
            grouped.get(key)!.push(item)
        })

        return Array.from(grouped.entries()).map(([projectId, items]) => {
            const doneCount = items.filter(i => i.status === 'done').length
            const totalCount = items.length
            const criticalCount = items.filter(i => i.status === 'blocked').length
            const latest = items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
            const project = projectId ? projects.find(p => p.id === projectId) : null
            return {
                projectId,
                projectName: project ? project.repo_name : (projectId ? 'Unknown' : 'Backlog'),
                items,
                doneCount,
                totalCount,
                progress: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0,
                criticalCount,
                latestUpdate: latest ? new Date(latest.updated_at).toLocaleDateString() : '-',
            }
        })
    }, [allItems, projects])

    // ─── Plans 분리 ───
    const activePlans = useMemo(() => plans.filter(p => p.status === 'active'), [plans])
    const backlogPlans = useMemo(() => plans.filter(p => p.status !== 'active' && p.status !== 'done'), [plans])
    const donePlans = useMemo(() => plans.filter(p => p.status === 'done'), [plans])

    // ─── Projects 분리 ───
    const activeProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects])
    const backlogProjects = useMemo(() => projects.filter(p => p.status !== 'active' && p.status !== 'completed'), [projects])
    const doneProjects = useMemo(() => projects.filter(p => p.status === 'completed'), [projects])

    // ─── Active Progress (서브태스크 기반 n/m) ───
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

    const handleDeactivatePlan = useCallback(async (planId: string) => {
        try { await updatePlan(planId, { status: 'backlog' }) }
        catch (err) { console.error('Failed to deactivate plan:', err) }
    }, [updatePlan])

    const handleDeactivateProject = useCallback(async (projectId: string) => {
        try { await updateProjectStatus(projectId, { status: 'archived' }) }
        catch (err) { console.error('Failed to deactivate project:', err) }
    }, [updateProjectStatus])

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

    const addSubTask = useCallback(async (entityId: string, entityType: 'plan' | 'project') => {
        const text = (subTaskInputs[entityId] ?? '').trim()
        if (!text) return
        const newTask: SubTask = { id: crypto.randomUUID(), title: text, done: false }

        if (entityType === 'plan') {
            const dp = getPlanDetailPlan(entityId)
            dp.sub_tasks.push(newTask)
            await savePlanDetailPlan(entityId, dp)
        }
        setSubTaskInputs(prev => ({ ...prev, [entityId]: '' }))
    }, [subTaskInputs, getPlanDetailPlan, savePlanDetailPlan])

    const toggleSubTask = useCallback(async (entityId: string, taskId: string, entityType: 'plan' | 'project') => {
        if (entityType === 'plan') {
            const dp = getPlanDetailPlan(entityId)
            dp.sub_tasks = dp.sub_tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
            await savePlanDetailPlan(entityId, dp)
        }
    }, [getPlanDetailPlan, savePlanDetailPlan])

    const removeSubTask = useCallback(async (entityId: string, taskId: string, entityType: 'plan' | 'project') => {
        if (entityType === 'plan') {
            const dp = getPlanDetailPlan(entityId)
            dp.sub_tasks = dp.sub_tasks.filter(t => t.id !== taskId)
            await savePlanDetailPlan(entityId, dp)
        }
    }, [getPlanDetailPlan, savePlanDetailPlan])

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
        const dp = entityType === 'plan' ? getPlanDetailPlan(entityId) : { sub_tasks: [], notes: '' }
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
                {entityType === 'plan' && (
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
                )}
            </div>
        )
    }

    // ─── Plans Section ───
    const renderPlansSection = () => (
        <div
            draggable
            onDragStart={(e) => handleSectionDragStart(e, 'plans')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleSectionDrop(e, 'plans')}
            className="transition-opacity"
        >
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 cursor-grab select-none">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                Plans ({backlogPlans.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {backlogPlans.length === 0 ? (
                    <Card className="sm:col-span-2 lg:col-span-3">
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
                            <Card
                                key={plan.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, plan.id, 'plan')}
                                onDragEnd={handleDragEnd}
                                onMouseDown={handleCardMouseDown}
                                onMouseUp={(e) => togglePlanExpand(plan.id, e)}
                                className="cursor-pointer hover:shadow-sm transition-all"
                            >
                                <CardContent className="p-5 min-h-[140px]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <div className={`w-3 h-3 rounded-full ${statusColor} shrink-0`} />
                                            <PlanIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm truncate">
                                                    {plan.title}
                                                    {plan.due_at && (
                                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                            Due: {new Date(plan.due_at).toLocaleDateString('ko-KR')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
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
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                            <button
                                                type="button"
                                                onClick={() => void deletePlan(plan.id)}
                                                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && renderDetailPanel(plan.id, 'plan')}
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )

    // ─── Projects Section ───
    const renderProjectsSection = () => (
        <div
            draggable
            onDragStart={(e) => handleSectionDragStart(e, 'projects')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleSectionDrop(e, 'projects')}
            className="transition-opacity"
        >
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2 cursor-grab select-none">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                Projects ({backlogProjects.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {backlogProjects.length === 0 ? (
                    <Card className="sm:col-span-2 lg:col-span-3">
                        <CardContent className="p-6 text-center text-muted-foreground">
                            <Github className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No projects. Import from Dashboard.</p>
                        </CardContent>
                    </Card>
                ) : (
                    backlogProjects.map(project => {
                        const isExpanded = expandedProjectIds.has(project.id)
                        return (
                            <Card
                                key={project.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, project.id, 'project')}
                                onDragEnd={handleDragEnd}
                                onMouseDown={handleCardMouseDown}
                                onMouseUp={(e) => toggleProjectExpand(project.id, e)}
                                className="cursor-pointer hover:shadow-sm transition-all"
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Github className="w-5 h-5 text-muted-foreground shrink-0" />
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm truncate flex items-center gap-1">
                                                    <span className="text-muted-foreground">{project.repo_full_name.split('/')[0]}/</span>
                                                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }} className="dark:!bg-[#7f1d1d33] dark:!text-[#fca5a5]">{project.repo_full_name.split('/')[1]}</span>
                                                </div>
                                                {project.description && (
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    {project.language && (
                                                        <Badge variant="outline" className="text-xs">{project.language}</Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-xs">{project.default_branch}</Badge>
                                                    {project.is_private && (
                                                        <Badge variant="outline" className="text-xs text-yellow-600">private</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                            <a
                                                href={project.repo_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                title="GitHub에서 열기"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => void removeProject(project.id)}
                                                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                                title="프로젝트 삭제"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <ProjectGitHubPanel
                                            repoFullName={project.repo_full_name}
                                            token={githubToken}
                                        />
                                    )}
                                </CardContent>
                            </Card>
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
        <div className="space-y-6">
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
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => void handleDrop(e)}
            >
                <h3 className="text-lg font-medium mb-4">Active Releases</h3>
                <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 p-2 rounded-lg border-2 border-dashed transition-all ${dragOverActive
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent'
                    }`}>
                    {/* Work Items 기반 릴리스 그룹 */}
                    {releaseGroups.map(group => (
                        <Card key={group.projectId ?? 'none'}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg">{group.projectName}</CardTitle>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                            <span>Updated {group.latestUpdate}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold">{group.progress}%</div>
                                        <div className="text-xs text-muted-foreground">
                                            {group.doneCount}/{group.totalCount} tasks
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Progress value={group.progress} className="h-2 mb-3" />
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span>{group.items.filter(i => i.energy).map(i => i.energy).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'N/A'}</span>
                                        </div>
                                        {group.criticalCount > 0 && (
                                            <div className="flex items-center gap-1 text-red-600">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span>{group.criticalCount} blocked</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Active Plans — 서브태스크 인라인 표시 */}
                    {activePlans.map(plan => {
                        const PlanIcon = plan.plan_type === 'event' ? Calendar
                            : plan.plan_type === 'project' ? GitBranch
                                : ListTodo
                        const dp = getPlanDetailPlan(plan.id)
                        const activeTasks = dp.sub_tasks.filter(t => !t.done)
                        const doneTasks = dp.sub_tasks.filter(t => t.done)
                        const progress = dp.sub_tasks.length > 0 ? Math.round((doneTasks.length / dp.sub_tasks.length) * 100) : 0
                        return (
                            <Card key={plan.id} className="border-blue-200 bg-blue-50/30">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                                            <PlanIcon className="w-4 h-4 text-blue-600" />
                                            <div>
                                                <div className="font-medium">
                                                    {plan.title}
                                                    {plan.due_at && (
                                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                            Due: {new Date(plan.due_at).toLocaleDateString('ko-KR')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs capitalize">{plan.plan_type}</Badge>
                                                    <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Active</Badge>
                                                    {plan.priority && (
                                                        <Badge variant={plan.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                                                            {plan.priority}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => void handleDeactivatePlan(plan.id)}
                                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Backlog으로 되돌리기">
                                                <ArrowLeft className="w-4 h-4" />
                                            </button>
                                            <button type="button" onClick={() => void deletePlan(plan.id)}
                                                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer" title="삭제">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sub Tasks 인라인 표시 */}
                                    {dp.sub_tasks.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Progress value={progress} className="h-2 flex-1" />
                                                <span className="text-xs text-muted-foreground font-medium">{doneTasks.length}/{dp.sub_tasks.length}</span>
                                            </div>

                                            {/* 활성 태스크 */}
                                            {activeTasks.length > 0 && (
                                                <div className="space-y-1">
                                                    {activeTasks.map(task => (
                                                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md bg-white/60 group">
                                                            <button
                                                                type="button"
                                                                onClick={() => void toggleSubTask(plan.id, task.id, 'plan')}
                                                                className="w-4 h-4 rounded border border-muted-foreground/30 hover:border-primary flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                                            />
                                                            <span className="text-sm flex-1">{task.title}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => void removeSubTask(plan.id, task.id, 'plan')}
                                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 완료된 태스크 */}
                                            {doneTasks.length > 0 && (
                                                <div className="space-y-1">
                                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</div>
                                                    {doneTasks.map(task => (
                                                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-md bg-green-50/50 group">
                                                            <button
                                                                type="button"
                                                                onClick={() => void toggleSubTask(plan.id, task.id, 'plan')}
                                                                className="w-4 h-4 rounded bg-green-500 border-green-500 text-white flex items-center justify-center shrink-0 cursor-pointer"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                            </button>
                                                            <span className="text-sm flex-1 line-through text-muted-foreground">{task.title}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => void removeSubTask(plan.id, task.id, 'plan')}
                                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 서브태스크 추가 */}
                                    <div className="flex items-center gap-2 mt-3">
                                        <input
                                            type="text"
                                            value={subTaskInputs[plan.id] ?? ''}
                                            onChange={(e) => setSubTaskInputs(prev => ({ ...prev, [plan.id]: e.target.value }))}
                                            onKeyDown={(e) => e.key === 'Enter' && void addSubTask(plan.id, 'plan')}
                                            placeholder="서브태스크 추가..."
                                            className="flex-1 text-sm px-3 py-1.5 rounded border border-border bg-white/80 focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0"
                                            onClick={() => void addSubTask(plan.id, 'plan')}
                                            disabled={!(subTaskInputs[plan.id] ?? '').trim()}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}

                    {/* Active Projects */}
                    {activeProjects.map(project => (
                        <Card key={project.id} className="border-green-200 bg-green-50/30">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <Github className="w-4 h-4 text-green-600" />
                                        <div>
                                            <div className="font-medium text-sm flex items-center gap-1">
                                                <span className="text-muted-foreground">{project.repo_full_name.split('/')[0]}/</span>
                                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }} className="dark:!bg-[#7f1d1d33] dark:!text-[#fca5a5]">{project.repo_full_name.split('/')[1]}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {project.language && <Badge variant="outline" className="text-xs">{project.language}</Badge>}
                                                <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Active</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => void handleDeactivateProject(project.id)}
                                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="비활성화">
                                            <ArrowLeft className="w-4 h-4" />
                                        </button>
                                        <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                                            className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors" title="GitHub">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {releaseGroups.length === 0 && activePlans.length === 0 && activeProjects.length === 0 && (
                        <Card className="lg:col-span-3">
                            <CardContent className="p-6 text-center text-muted-foreground">
                                <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No active releases. Drag a plan or project here to activate.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* ─── 구분선 ─── */}
            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground font-medium tracking-wider">Plans & Projects</span>
                </div>
            </div>

            {/* Draggable Sections */}
            {sectionOrder.map(sectionId => sectionRenderers[sectionId]?.())}

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
        </div >
    )
}
