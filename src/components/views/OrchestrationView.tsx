// ============================================
// OrchestrationView — 에디터 등록 + AI Task Analyzer
// GitHub 프로젝트 연동 + Gemini API + work_items 저장
// ============================================

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useOrchestration } from '../../hooks/useOrchestration'
import { useProjects } from '../../hooks/useProjects'
import { useWorkItems } from '../../hooks/useWorkItems'
import { useEditorModels } from '../../hooks/useEditorModels'
import { useModelScores } from '../../hooks/useModelScores'
import { getReadme, listCommits, getCommitDetail, listIssues } from '../../lib/github/githubApi'
import { analyzeTaskWithGemini, type GeminiTaskResult, type ProjectContext } from '../../lib/gemini'
import { logEvent } from '../../lib/supabase/eventLogs'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { useAuth } from '../../hooks/useAuth'
import type { EditorType, AIModel } from '../../types/index'
import { TASK_TYPES } from '../../features/orchestration/taskTypes'
import type { TaskType } from '../../features/orchestration/taskTypes'
import { CliMonitorPanel } from './CliMonitorPanel'
import {
    Plus,
    Sparkles,
    Activity,
    CheckCircle,
    XCircle,
    TrendingUp,
    Monitor,
    Send,
    Pencil,
    Save,
    Loader2,
    Clock,
    AlertTriangle,
} from 'lucide-react'

// ─── 에디터 설정 ───
interface EditorConfig {
    type: EditorType
    label: string
    icon?: string
    enabled: boolean
    supportedModels: AIModel[]
}

const EDITORS: EditorConfig[] = [
    {
        type: 'cursor', label: 'Cursor', icon: '/Cursor.png', enabled: true,
        supportedModels: [
            'claude_opus_4_6', 'claude_sonnet_4_6',
            'gpt_5_3_codex', 'gpt_5_3_codex_spark', 'gpt_5_2_codex',
            'gemini_3_1_pro', 'gemini_3_pro', 'gemini_3_flash', 'gemini_3_deep_think',
            'grok_code', 'kimi_2_5', 'cursor_composer'
        ]
    },
    {
        type: 'claude_code', label: 'Claude Code', icon: '/Claude%20Code.png', enabled: true,
        supportedModels: ['claude_sonnet_4_6', 'claude_opus_4_6']
    },
    {
        type: 'codex', label: 'Codex', icon: '/Codex.png', enabled: true,
        supportedModels: ['gpt_5_3_codex', 'gpt_5_3_codex_spark', 'gpt_5_2_codex']
    },
    {
        type: 'antigravity', label: 'Antigravity', icon: '/Antigravity.png', enabled: true,
        supportedModels: ['gemini_3_1_pro', 'gemini_3_pro', 'gemini_3_flash', 'claude_sonnet_4_6', 'claude_opus_4_6', 'grok_code', 'kimi_2_5']
    }
]

// ─── AI 모델 설정 (2026.02.19 최신) ───
const MODEL_CONFIG: Record<AIModel, { label: string; color: string }> = {
    claude_opus_4_6: { label: 'Claude Opus 4.6', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
    claude_sonnet_4_6: { label: 'Claude Sonnet 4.6', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
    gpt_5_3_codex: { label: 'GPT-5.3-Codex', color: 'bg-green-500/10 text-green-600 border-green-200' },
    gpt_5_3_codex_spark: { label: 'GPT-5.3-Spark', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    gpt_5_2_codex: { label: 'GPT-5.2-Codex', color: 'bg-lime-500/10 text-lime-600 border-lime-200' },
    cursor_composer: { label: 'Cursor Composer', color: 'bg-violet-500/10 text-violet-600 border-violet-200' },
    gemini_3_1_pro: { label: 'Gemini 3.1 Pro', color: 'bg-blue-600/10 text-blue-700 border-blue-300' },
    gemini_3_pro: { label: 'Gemini 3 Pro', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
    gemini_3_flash: { label: 'Gemini 3 Flash', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200' },
    gemini_3_deep_think: { label: 'Gemini 3 Deep Think', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
    grok_code: { label: 'Grok Code', color: 'bg-zinc-500/10 text-zinc-600 border-zinc-200' },
    kimi_2_5: { label: 'Kimi 2.5', color: 'bg-rose-500/10 text-rose-600 border-rose-200' },
}

// ─── 분해 작업 타입 ───
interface AnalyzedTask {
    instruction: string
    task_type: TaskType
    suggested_model: AIModel
    complexity: 'low' | 'medium' | 'high'
    estimate_min: number
    selected: boolean
    reference?: string
}

export function OrchestrationView({ onNavigateToPlan }: { onNavigateToPlan?: () => void }) {
    const { user } = useAuth()
    const githubToken = user?.user_metadata?.github_token

    // 설정 상태훅
    const { registeredEditors, stats, toggle } = useOrchestration()
    const { projects, updateProjectStatus } = useProjects()
    const { items: allItems, addItem } = useWorkItems()
    const { editorModels } = useEditorModels()
    const { scores: modelScores } = useModelScores()

    // ─── 에디터에서 사용 가능한 모델 (DB 데이터 기반 합집합) ───
    const availableModels = useMemo(() => {
        const modelSet = new Set<AIModel>()
        for (const em of editorModels) {
            if (registeredEditors.includes(em.editorType)) {
                em.supportedModels.forEach(m => modelSet.add(m))
            }
        }
        return Array.from(modelSet)
    }, [registeredEditors, editorModels])

    const noEditorsSelected = registeredEditors.length === 0

    // ─── Analyzer 상태 ───
    const [selectedProjectId, setSelectedProjectId] = useState<string>('')
    const [taskInput, setTaskInput] = useState('')
    const [analyzedTasks, setAnalyzedTasks] = useState<AnalyzedTask[]>([])
    const [analyzing, setAnalyzing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [aiError, setAiError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [projectContext, setProjectContext] = useState<ProjectContext | null>(null)
    const [contextLoading, setContextLoading] = useState(false)

    // 선택된 프로젝트 이름
    const selectedProject = projects.find(p => p.id === selectedProjectId)

    // ─── 프로젝트 선택 시 README + 커밋 + 변경파일 fetch ───
    const fetchProjectContext = useCallback(async (projectId: string) => {
        const project = projects.find(p => p.id === projectId)
        if (!project || !githubToken) {
            setProjectContext(null)
            return
        }

        setContextLoading(true)
        try {
            const [owner, repo] = project.repo_full_name.split('/')
            const [readmeResult, commitsResult, issuesResult] = await Promise.allSettled([
                getReadme(githubToken, owner, repo),
                listCommits(githubToken, owner, repo, undefined, 10),
                listIssues(githubToken, owner, repo, 'open', 10),
            ])

            const readme = readmeResult.status === 'fulfilled' ? readmeResult.value : null
            const commits = commitsResult.status === 'fulfilled' ? commitsResult.value : []
            const issues = issuesResult.status === 'fulfilled' ? issuesResult.value : []

            // 커밋 상세 (최근 5개의 변경 파일)
            const recentShas = commits.slice(0, 5).map(c => c.sha)
            const detailResults = await Promise.allSettled(
                recentShas.map(sha => getCommitDetail(githubToken, owner, repo, sha)),
            )
            const changedFiles = [...new Set(detailResults
                .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
                .flatMap(r => r.value)
                .map(f => f.filename)
            )]

            setProjectContext({
                repoName: project.repo_full_name,
                language: project.language,
                readme,
                recentCommits: commits.map(c => c.commit.message.split('\n')[0]),
                recentChangedFiles: changedFiles,
                openIssues: issues.map(i => ({
                    number: i.number,
                    title: i.title,
                    body: i.body ?? '',
                    labels: i.labels ? i.labels.map(l => l.name) : []
                })),
                fetchedAt: Date.now(),
            })
        } catch {
            setProjectContext(null)
        } finally {
            setContextLoading(false)
        }
    }, [projects, githubToken])

    useEffect(() => {
        if (selectedProjectId) {
            void fetchProjectContext(selectedProjectId)
        } else {
            setProjectContext(null)
        }
    }, [selectedProjectId, fetchProjectContext])

    // ─── 메트릭 ───
    const metrics = useMemo(() => {
        const totalTasks = stats.reduce((s, a) => s + a.total_tasks, 0)
        const totalCompleted = stats.reduce((s, a) => s + a.completed, 0)
        const totalFailed = stats.reduce((s, a) => s + a.failed, 0)
        const successRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0
        return { totalTasks, totalCompleted, totalFailed, successRate }
    }, [stats])

    // ─── Gemini AI 분석 (프로젝트 컨텍스트 포함) ───
    const runGeminiAnalysis = async () => {
        if (!taskInput.trim() || noEditorsSelected) return
        setAnalyzing(true)
        setAiError(null)
        setSaveSuccess(false)

        try {
            const results = await analyzeTaskWithGemini(
                taskInput,
                availableModels,
                projectContext ?? undefined,
                modelScores,
            )
            const newAnalyzedTasks = results.map((r: GeminiTaskResult) => ({
                instruction: r.instruction,
                task_type: r.task_type,
                suggested_model: availableModels.includes(r.suggested_model) ? r.suggested_model : availableModels[0],
                complexity: r.complexity,
                estimate_min: r.estimate_min,
                selected: false,
                reference: r.reference,
            }))
            setAnalyzedTasks(newAnalyzedTasks)
            setExpandedTasks(new Set()) // 분석 새로 고침 시 닫힘 초기화
            setSaveMessage(null)
            // 추가: 오케스트레이션 분석 완료 기록 (비동기)
            logEvent('orchestration_analyzed', {
                project_id: selectedProjectId,
                instruction_length: taskInput.length,
                task_count: newAnalyzedTasks.length
            }, 'ai').catch(console.error)

        } catch (err) {
            setAiError(err instanceof Error ? err.message : 'AI 분석 실패')
        } finally {
            setAnalyzing(false)
        }
    }

    // ─── 직접 입력 ───
    const startManual = () => {
        if (noEditorsSelected) return
        setAiError(null)
        setSaveSuccess(false)
        setAnalyzedTasks([{
            instruction: '',
            task_type: 'code_write',
            suggested_model: availableModels[0] ?? 'claude_sonnet_4_6',
            complexity: 'medium',
            estimate_min: 30,
            selected: true,
        }])
    }

    // ─── 작업 선택 토글 ───
    const toggleSelect = (idx: number) => {
        setAnalyzedTasks(prev =>
            prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t)
        )
    }

    // ─── 작업 수정 ───
    const updateTask = (idx: number, updates: Partial<AnalyzedTask>) => {
        setAnalyzedTasks(prev =>
            prev.map((t, i) => i === idx ? { ...t, ...updates } : t)
        )
    }

    const changeTaskType = (idx: number, newType: TaskType) => {
        const meta = TASK_TYPES.find(t => t.type === newType)
        const defaultModel = meta?.defaultModel ?? 'claude_sonnet_4_6'
        updateTask(idx, {
            task_type: newType,
            suggested_model: availableModels.includes(defaultModel) ? defaultModel : availableModels[0],
        })
    }

    const addEmptyTask = () => {
        setAnalyzedTasks(prev => [...prev, {
            instruction: '',
            task_type: 'code_write',
            suggested_model: availableModels[0] ?? 'claude_sonnet_4_6',
            complexity: 'medium',
            estimate_min: 30,
            selected: true,
        }])
    }

    // ─── 선택된 것만 work_items에 저장 ───
    const selectedTasks = analyzedTasks.filter(t => t.selected)

    const saveToWorkItems = async () => {
        if (selectedTasks.length === 0) return

        // 중복 검사: 같은 프로젝트 내 동일 제목 확인
        const existingTitles = new Set(
            allItems
                .filter(i => i.project_id === (selectedProjectId || null) && !i.deleted_at)
                .map(i => i.title.trim().toLowerCase())
        )
        const duplicates = selectedTasks.filter(t =>
            t.instruction.trim() && existingTitles.has(t.instruction.trim().toLowerCase())
        )
        if (duplicates.length > 0) {
            const dupNames = duplicates.map(d => `"${d.instruction}"`).join(', ')
            const proceed = window.confirm(
                `이미 동일한 작업이 존재합니다:\n${dupNames}\n\n그래도 저장하시겠습니까?`
            )
            if (!proceed) return
        }

        setSaving(true)
        setAiError(null)
        try {
            for (const task of selectedTasks) {
                if (!task.instruction.trim()) continue
                await addItem({
                    title: task.instruction,
                    project_id: selectedProjectId || null,
                    estimate_min: task.estimate_min,
                    status: 'backlog',
                    next_action: `[${task.task_type}] ${MODEL_CONFIG[task.suggested_model]?.label ?? task.suggested_model}`,
                    source_app: 'orchestration',
                })
            }
            const targetName = selectedProject ? selectedProject.repo_name : 'Backlog'
            setSaveSuccess(true)
            setAiError(null)
            // 저장 성공 메시지에 위치 표시
            setSaveMessage(`${selectedTasks.length}개 작업 → ${targetName}에 저장 완료! (Release Plan 뷰에서 확인 가능)`)
            setAnalyzedTasks(prev => prev.filter(t => !t.selected))

            // UX 초기화 및 페이지 이동
            setTaskInput('')
            if (selectedProjectId) {
                const proj = projects.find(p => p.id === selectedProjectId)
                if (proj && proj.status !== 'active') {
                    await updateProjectStatus(selectedProjectId, { status: 'active' })
                }
            }
            if (onNavigateToPlan) {
                // 토스트나 시각적 피드백을 위해 약간의 딜레이 후 이동
                setTimeout(() => {
                    onNavigateToPlan()
                }, 1000)
            }
        } catch (err) {
            setAiError(err instanceof Error ? err.message : '저장 실패')
        } finally {
            setSaving(false)
        }
    }

    const [saveMessage, setSaveMessage] = useState<string | null>(null)

    // 카드 펼침 상태 (인덱스 Set)
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set())

    // ─── 헬퍼 ───
    const totalEstimate = analyzedTasks.reduce((s, t) => s + t.estimate_min, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-semibold">Agent Orchestration</h2>
                <p className="text-muted-foreground">에디터 등록 + AI 기반 작업 오케스트레이션</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Tasks</CardTitle>
                        <Activity className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalTasks}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Completed</CardTitle>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{metrics.totalCompleted}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Failed</CardTitle>
                        <XCircle className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{metrics.totalFailed}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Success</CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.successRate}%</div>
                    </CardContent>
                </Card>
            </div>

            {/* Editor Tiles */}
            <Card>
                <CardHeader>
                    <CardTitle>My Editors</CardTitle>
                    {noEditorsSelected && (
                        <p className="text-sm text-amber-600 flex items-center gap-1.5 mt-1">
                            <AlertTriangle className="w-4 h-4" />
                            AI 분석을 사용하려면 에디터를 하나 이상 선택하세요
                        </p>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        {EDITORS.map(editor => {
                            const isActive = registeredEditors.includes(editor.type)
                            const isDisabled = !editor.enabled
                            return (
                                <button
                                    key={editor.type}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => !isDisabled && toggle(editor.type)}
                                    className={`
                                        relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all w-[100px]
                                        ${isDisabled
                                            ? 'border-transparent bg-muted/10 text-muted-foreground/30 cursor-not-allowed opacity-40'
                                            : isActive
                                                ? 'border-green-500 bg-green-500/10 text-green-700 shadow-md scale-105'
                                                : 'border-muted bg-muted/30 text-muted-foreground hover:border-green-400/50 hover:bg-muted/50 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    {editor.icon ? (
                                        <img
                                            src={editor.icon}
                                            alt={editor.label}
                                            className={`w-10 h-10 rounded-lg ${isDisabled ? 'grayscale' : ''}`}
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                            <Monitor className="w-5 h-5" />
                                        </div>
                                    )}
                                    <span className="text-xs font-medium">{editor.label}</span>
                                    {isActive && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* AI Task Analyzer */}
            <Card className={noEditorsSelected ? 'opacity-60 pointer-events-none' : ''}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        AI Task Analyzer
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* 프로젝트 선택 */}
                    <select
                        value={selectedProjectId}
                        onChange={e => setSelectedProjectId(e.target.value)}
                        className="w-full px-4 py-3 border rounded-lg bg-background text-sm"
                    >
                        <option value="">프로젝트 선택</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.repo_name}</option>
                        ))}
                    </select>

                    {/* 프로젝트 컨텍스트 상태 */}
                    {contextLoading && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            README + 커밋 내역 로딩 중...
                        </p>
                    )}
                    {projectContext && !contextLoading && (
                        <p className="text-xs text-green-600">
                            프로젝트 컨텍스트 로드 완료 (커밋 {projectContext.recentCommits.length}개{projectContext.readme ? ' + README' : ''}{projectContext.openIssues && projectContext.openIssues.length > 0 ? ` + 이슈 ${projectContext.openIssues.length}개` : ''})
                        </p>
                    )}

                    {/* 자연어 입력 */}
                    <textarea
                        placeholder="무엇을 해야 하나요? 자연어로 입력하세요.&#10;예: OAuth 인증 구현하고 프론트에 연동, DB 마이그레이션까지"
                        value={taskInput}
                        onChange={e => setTaskInput(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border rounded-lg bg-background text-sm resize-none"
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                runGeminiAnalysis()
                            }
                        }}
                    />

                    {/* 액션 버튼 */}
                    <div className="flex gap-3">
                        <Button
                            onClick={runGeminiAnalysis}
                            disabled={!taskInput.trim() || analyzing}
                            className="flex-1 h-12 text-base"
                        >
                            {analyzing ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5 mr-2" />
                            )}
                            {analyzing ? 'Gemini 분석 중...' : 'AI 분석 (⌘+Enter)'}
                        </Button>
                        <Button variant="outline" onClick={startManual} className="h-12 text-base px-6">
                            <Pencil className="w-5 h-5 mr-2" />
                            직접 입력
                        </Button>
                    </div>

                    {/* 에러 */}
                    {aiError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {aiError}
                        </div>
                    )}

                    {/* 저장 성공 */}
                    {saveSuccess && saveMessage && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 shrink-0" />
                            {saveMessage}
                        </div>
                    )}

                    {/* 분해된 작업 — 클릭 선택형 카드 */}
                    {analyzedTasks.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    클릭하여 작업을 선택한 후 저장하세요
                                </p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span>{selectedTasks.length}/{analyzedTasks.length} 선택</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        ~{totalEstimate}min
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {analyzedTasks.map((task, idx) => {
                                    const modelCfg = MODEL_CONFIG[task.suggested_model] ?? { label: task.suggested_model, color: '' }
                                    const isExpanded = expandedTasks.has(idx)

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => toggleSelect(idx)}
                                            className={`
                                                relative p-6 rounded-xl border-2 cursor-pointer transition-all select-none
                                                ${task.selected
                                                    ? 'border-primary bg-primary/5 shadow-md'
                                                    : 'border-muted bg-card hover:border-muted-foreground/30 hover:shadow-sm'
                                                }
                                            `}
                                        >
                                            {/* 우측 상단 컨트롤: 펼치기 + 선택 체크 */}
                                            <div className="absolute top-5 right-5 flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setExpandedTasks(prev => {
                                                            const n = new Set(prev)
                                                            if (n.has(idx)) n.delete(idx)
                                                            else n.add(idx)
                                                            return n
                                                        })
                                                    }}
                                                    className="p-1 rounded text-muted-foreground hover:bg-muted/60 transition-colors"
                                                >
                                                    <span className="text-xs font-medium px-1">
                                                        {isExpanded ? '접기' : '세부 정보'}
                                                    </span>
                                                </button>
                                                <div className={`
                                                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                                    ${task.selected
                                                        ? 'border-primary bg-primary text-white'
                                                        : 'border-muted-foreground/30'
                                                    }
                                                `}>
                                                    {task.selected && <CheckCircle className="w-4 h-4" />}
                                                </div>
                                            </div>

                                            {/* 작업 제목 — 시각적 구분 */}
                                            <div className="pr-[120px] mb-2">
                                                <textarea
                                                    value={task.instruction}
                                                    onChange={e => {
                                                        e.stopPropagation()
                                                        updateTask(idx, { instruction: e.target.value })
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    onMouseDown={e => e.stopPropagation()}
                                                    placeholder="작업 설명을 입력하세요"
                                                    rows={1}
                                                    className="w-full bg-transparent text-lg font-semibold border-b border-transparent px-1 py-1 outline-none focus:border-primary focus:bg-background transition-colors resize-none overflow-hidden placeholder:text-muted-foreground/50"
                                                    style={{ minHeight: '36px' }}
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement
                                                        target.style.height = 'auto'
                                                        target.style.height = target.scrollHeight + 'px'
                                                    }}
                                                />
                                            </div>

                                            {/* 태스크 타입 및 주요 요약 (항상 표시되는 보조 정보) */}
                                            {!isExpanded && (
                                                <div className="flex items-center gap-2 mt-2 px-1 text-sm text-muted-foreground">
                                                    <Badge variant="outline" className={`font-normal ${modelCfg.color}`}>{modelCfg.label}</Badge>
                                                    <span>•</span>
                                                    <span>{TASK_TYPES.find(t => t.type === task.task_type)?.label || task.task_type}</span>
                                                    <span>•</span>
                                                    <span>~{task.estimate_min}m</span>
                                                </div>
                                            )}

                                            {/* 하단 세부 정보 (접기/펼치기) */}
                                            {isExpanded && (
                                                <div className="flex flex-col gap-4 mt-5 p-4 rounded-lg bg-muted/30 border border-muted" onClick={e => e.stopPropagation()}>
                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <div>
                                                            <label className="text-xs font-medium text-muted-foreground block mb-1.5">유형 (표시색)</label>
                                                            <select
                                                                value={task.task_type}
                                                                onChange={e => changeTaskType(idx, e.target.value as TaskType)}
                                                                className="w-full px-3 py-2 border rounded-md text-sm bg-background font-medium"
                                                            >
                                                                {TASK_TYPES.map(tt => (
                                                                    <option key={tt.type} value={tt.type}>{tt.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-medium text-muted-foreground block mb-1.5">할당 모델</label>
                                                            <select
                                                                value={task.suggested_model}
                                                                onChange={e => updateTask(idx, { suggested_model: e.target.value as AIModel })}
                                                                className="w-full px-3 py-2 border rounded-md text-sm bg-background font-medium"
                                                            >
                                                                {availableModels.map(m => (
                                                                    <option key={m} value={m}>{MODEL_CONFIG[m]?.label ?? m}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-medium text-muted-foreground block mb-1.5">예상 시간 (분)</label>
                                                            <input
                                                                type="number"
                                                                value={task.estimate_min}
                                                                onChange={e => updateTask(idx, { estimate_min: parseInt(e.target.value) || 0 })}
                                                                className="w-full px-3 py-2 border rounded-md text-sm bg-background font-medium"
                                                                min={1}
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-medium text-muted-foreground block mb-1.5">참조 컨텍스트</label>
                                                            <input
                                                                type="text"
                                                                value={task.reference ?? ''}
                                                                onChange={e => updateTask(idx, { reference: e.target.value })}
                                                                placeholder="ex) User Prompt"
                                                                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* 추가 + 저장 */}
                            <div className="flex gap-3 mt-6">
                                <Button variant="outline" onClick={addEmptyTask} className="flex-1 h-12 text-base">
                                    <Plus className="w-5 h-5 mr-2" />
                                    작업 추가
                                </Button>
                                <Button
                                    onClick={saveToWorkItems}
                                    disabled={saving || selectedTasks.length === 0}
                                    className="flex-1 h-12 text-base"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5 mr-2" />
                                    )}
                                    {saving
                                        ? '저장 중...'
                                        : `${selectedTasks.length}개 ${selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.repo_name + '에' : 'Backlog에'} 저장`
                                    }
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CLI Monitor */}
            <CliMonitorPanel />
        </div>
    )
}
