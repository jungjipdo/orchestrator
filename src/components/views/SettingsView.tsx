// ============================================
// SettingsView — Settings + GitHub + 모델 관리
// ============================================

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
    Settings,
    Github,
    ExternalLink,
    Loader2,
    Unlink,
    ChevronLeft,
    ChevronRight,
    Check,
    RefreshCw,
    Eye,
} from 'lucide-react'
import { useGitHub } from '../../hooks/useGitHub'
import { useModelScores, type ModelScoreEntry, DEFAULT_SCORES } from '../../hooks/useModelScores'
import { useEditorModels } from '../../hooks/useEditorModels'
import type { AIModel, EditorType } from '../../types/index'
import { useWatcher } from '../../hooks/useWatcher'
import { useProjects } from '../../hooks/useProjects'

const ALL_MODELS: { key: AIModel; label: string; short: string }[] = [
    // 최신 → 이전 순서 (왼쪽이 최신)
    // Anthropic
    { key: 'claude_opus_4_6', label: 'Claude Opus 4.6', short: 'Opus 4.6' },
    { key: 'claude_sonnet_4_6', label: 'Claude Sonnet 4.6', short: 'Sonnet 4.6' },
    // OpenAI
    { key: 'gpt_5_3_codex', label: 'GPT-5.3-Codex', short: 'GPT-5.3' },
    { key: 'gpt_5_3_codex_spark', label: 'GPT-5.3-Codex-Spark', short: 'Spark' },
    { key: 'gpt_5_2_codex', label: 'GPT-5.2-Codex', short: 'GPT-5.2' },
    // Cursor
    { key: 'cursor_composer', label: 'Cursor Composer', short: 'Composer' },
    // Google
    { key: 'gemini_3_1_pro', label: 'Gemini 3.1 Pro', short: 'Gem3.1 Pro' },
    { key: 'gemini_3_pro', label: 'Gemini 3 Pro', short: 'Gem3 Pro' },
    { key: 'gemini_3_flash', label: 'Gemini 3 Flash', short: 'Gem3 Flash' },
    { key: 'gemini_3_deep_think', label: 'Gemini 3 Deep Think', short: 'Gem3 Think' },
    // xAI
    { key: 'grok_code', label: 'Grok Code', short: 'Grok Code' },
    // Moonshot
    { key: 'kimi_2_5', label: 'Kimi 2.5', short: 'Kimi 2.5' },
]

const ALL_EDITORS: { type: EditorType; label: string }[] = [
    { type: 'cursor', label: 'Cursor' },
    { type: 'claude_code', label: 'Claude Code' },
    { type: 'codex', label: 'Codex' },
    { type: 'antigravity', label: 'Antigravity' },
]

const REPOS_PER_PAGE = 5
const CATEGORIES = ['coding', 'analysis', 'documentation', 'speed'] as const
const CATEGORY_LABELS: Record<string, string> = {
    coding: 'Coding',
    analysis: 'Analysis',
    documentation: 'Docs',
    speed: 'Speed',
}

export function SettingsView() {
    const {
        isConnected,
        username,
        loading,
        repos,
        tokenExpired,
        connect,
        disconnect,
        reconnect,
    } = useGitHub()

    const { scores, updateScore } = useModelScores()
    const { editorModels } = useEditorModels()

    const [repoPage, setRepoPage] = useState(0)
    const [confirmDisconnect, setConfirmDisconnect] = useState(false)
    const [disconnecting, setDisconnecting] = useState(false)
    const [confirmResetScores, setConfirmResetScores] = useState(false)

    const handleDisconnect = async () => {
        setDisconnecting(true)
        try {
            await disconnect()
        } finally {
            setDisconnecting(false)
            setConfirmDisconnect(false)
        }
    }

    const totalPages = Math.max(1, Math.ceil(repos.length / REPOS_PER_PAGE))
    const pagedRepos = repos.slice(
        repoPage * REPOS_PER_PAGE,
        repoPage * REPOS_PER_PAGE + REPOS_PER_PAGE,
    )

    // ─── 모델 점수: 로컬 state + onPointerUp에서만 DB 저장 (버벅임 방지) ───
    const [localScores, setLocalScores] = useState<Record<string, Record<string, number>>>({})

    const getScoreValue = (modelKey: string, category: string): number => {
        return localScores[modelKey]?.[category] ?? scores.find(s => s.model_key === modelKey)?.[category as keyof ModelScoreEntry] as number ?? 50
    }

    const handleScoreInput = (modelKey: string, category: string, value: number) => {
        setLocalScores(prev => ({
            ...prev,
            [modelKey]: { ...(prev[modelKey] ?? {}), [category]: value },
        }))
    }

    const handleScoreCommit = (entry: ModelScoreEntry) => {
        const local = localScores[entry.model_key]
        if (!local) return
        void updateScore(entry.model_key, {
            coding: local.coding ?? entry.coding,
            analysis: local.analysis ?? entry.analysis,
            documentation: local.documentation ?? entry.documentation,
            speed: local.speed ?? entry.speed,
        })
    }

    const handleResetScores = async () => {
        try {
            await Promise.all(
                (Object.keys(DEFAULT_SCORES) as AIModel[]).map(key =>
                    updateScore(key, DEFAULT_SCORES[key])
                )
            )
            setLocalScores({}) // 로컬 점수 리셋
        } catch (err) {
            console.error('점수 초기화 실패:', err)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-semibold">Settings</h2>
                <p className="text-muted-foreground">Configure your orchestration preferences and integrations</p>
            </div>

            {/* GitHub Connection Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Github className="w-5 h-5" />
                        GitHub Integration
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            연결 상태 확인 중...
                        </div>
                    ) : isConnected ? (
                        <div className="space-y-4">
                            {tokenExpired && (
                                <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
                                    <p className="text-sm text-destructive font-medium">
                                        ⚠️ GitHub 토큰이 만료되었습니다
                                    </p>
                                    <Button size="sm" variant="destructive" onClick={reconnect}>
                                        재연결
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                        <Github className="w-5 h-5 text-foreground" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">@{username}</span>
                                            <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
                                                Connected
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {repos.length}개 레포 접근 가능
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={reconnect}>
                                        <RefreshCw className="w-4 h-4 mr-1.5" />
                                        권한 갱신
                                    </Button>
                                    {confirmDisconnect ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground mr-1">해제할까요?</span>
                                            <Button variant="destructive" size="sm" disabled={disconnecting} onClick={() => void handleDisconnect()}>
                                                {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '확인'}
                                            </Button>
                                            <Button variant="ghost" size="sm" disabled={disconnecting} onClick={() => setConfirmDisconnect(false)}>
                                                취소
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDisconnect(true)}>
                                            <Unlink className="w-4 h-4 mr-1.5" />
                                            연결 해제
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-md border border-border/50 flex items-start gap-2">
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium mt-0.5">Tip</span>
                                <p>프라이빗 레포나 조직 레포가 전부 보이지 않는다면, GitHub SSO 보안 세션이 만료되었거나 권한이 축소된 상태일 수 있습니다. <b>권한 갱신</b>을 눌러 다시 로그인해주세요.</p>
                            </div>
                            {repos.length > 0 && (
                                <div>
                                    <div className="border rounded-lg divide-y">
                                        {pagedRepos.map((repo) => (
                                            <div key={repo.id} className="flex items-center justify-between px-4 py-3">
                                                <span className="text-sm truncate mr-3">
                                                    {repo.full_name.includes('/') ? (
                                                        <>
                                                            <span className="text-muted-foreground">{repo.full_name.split('/')[0]}/</span>
                                                            <span className="font-medium text-foreground ml-0.5">{repo.full_name.split('/').slice(1).join('/')}</span>
                                                        </>
                                                    ) : (
                                                        <span className="font-medium">{repo.full_name}</span>
                                                    )}
                                                </span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {repo.language && (
                                                        <span className="text-xs px-2 py-0.5 bg-muted rounded">{repo.language}</span>
                                                    )}
                                                    {repo.private && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-yellow-600/70 text-yellow-700 dark:text-yellow-500 font-medium">private</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-2 px-1">
                                            <Button variant="ghost" size="sm" disabled={repoPage === 0} onClick={() => setRepoPage(p => p - 1)} className="h-7 px-2">
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <span className="text-xs text-muted-foreground">
                                                {repoPage + 1} / {totalPages}
                                            </span>
                                            <Button variant="ghost" size="sm" disabled={repoPage >= totalPages - 1} onClick={() => setRepoPage(p => p + 1)} className="h-7 px-2">
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Github className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                            <h3 className="text-sm font-medium mb-1">GitHub 미연결</h3>
                            <p className="text-xs text-muted-foreground mb-4">
                                GitHub를 연결하면 프로젝트 생성 시 레포를 선택할 수 있습니다
                            </p>
                            <Button onClick={connect}>
                                <Github className="w-4 h-4 mr-2" />
                                GitHub 연결하기
                                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AI Model Scoring */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-base">AI Model Scoring</CardTitle>
                        <p className="text-xs text-muted-foreground">각 모델의 카테고리별 성능 점수 (0-100). AI 추천 시 높은 점수 모델이 우선됩니다.</p>
                    </div>
                    {confirmResetScores ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground mr-1">정말 초기화할까요?</span>
                            <Button variant="destructive" size="sm" onClick={() => {
                                setConfirmResetScores(false)
                                void handleResetScores()
                            }}>
                                확인
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmResetScores(false)}>
                                취소
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setConfirmResetScores(true)}>
                            기본 점수로 초기화
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 pr-4 font-medium">Model</th>
                                    {CATEGORIES.map(cat => (
                                        <th key={cat} className="text-center py-2 px-2 font-medium min-w-[80px]">
                                            {CATEGORY_LABELS[cat]}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {scores.map(entry => (
                                    <tr key={entry.model_key} className="border-b last:border-0">
                                        <td className="py-3 pr-4 font-medium text-xs whitespace-nowrap">
                                            {ALL_MODELS.find(m => m.key === entry.model_key)?.short ?? entry.model_key}
                                            {entry.model_key === 'gemini_3_1_pro' && (
                                                <Badge variant="default" className="ml-1 h-3.5 text-[9px] px-1 py-0 leading-none bg-gradient-to-r from-blue-500 to-indigo-500">New</Badge>
                                            )}
                                        </td>
                                        {CATEGORIES.map(cat => (
                                            <td key={cat} className="py-3 px-1 text-center">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        value={getScoreValue(entry.model_key, cat)}
                                                        onChange={e => {
                                                            handleScoreInput(entry.model_key, cat, Number(e.target.value))
                                                        }}
                                                        onPointerUp={() => handleScoreCommit(entry)}
                                                        onTouchEnd={() => handleScoreCommit(entry)}
                                                        className="w-full h-1.5 accent-primary cursor-pointer"
                                                    />
                                                    {(() => {
                                                        const current = getScoreValue(entry.model_key, cat)
                                                        const defaultVal = DEFAULT_SCORES[entry.model_key]?.[cat as keyof typeof DEFAULT_SCORES[typeof entry.model_key]] ?? 50
                                                        const delta = current - defaultVal
                                                        const isModified = delta !== 0
                                                        return (
                                                            <div className="flex items-center gap-1 justify-end min-w-[36px]">
                                                                <span className="text-xs tabular-nums font-semibold text-foreground">
                                                                    {defaultVal}
                                                                </span>
                                                                {isModified && (
                                                                    <span className={`text-[10px] tabular-nums font-bold ${delta > 0 ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`}>
                                                                        {delta > 0 ? '+' : ''}{delta}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    })()}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Editor → Model Mapping */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Editor → Model Mapping</CardTitle>
                    <p className="text-xs text-muted-foreground">에디터별 지원 모델 현황입니다 (고정).</p>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                        <table className="text-sm no-scrollbar" style={{ minWidth: 'max-content' }}>
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 pr-4 font-medium sticky left-0 bg-background z-10 min-w-[100px]">Editor</th>
                                    {ALL_MODELS.map(m => (
                                        <th key={m.key} className="text-center py-2 px-2 font-medium text-xs whitespace-nowrap min-w-[80px]">
                                            {m.short}
                                            {m.key === 'gemini_3_1_pro' && (
                                                <Badge variant="default" className="ml-1 h-3.5 text-[9px] px-1 py-0 leading-none bg-gradient-to-r from-blue-500 to-indigo-500">New</Badge>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ALL_EDITORS.map(editor => {
                                    const entry = editorModels.find(e => e.editorType === editor.type)
                                    const models = entry?.supportedModels ?? []
                                    return (
                                        <tr key={editor.type} className="border-b last:border-0 hover:bg-muted/5">
                                            <td className="py-3 pr-4 font-medium text-xs sticky left-0 bg-background z-10">{editor.label}</td>
                                            {ALL_MODELS.map(m => {
                                                const isChecked = models.includes(m.key)
                                                return (
                                                    <td key={m.key} className="py-3 px-2">
                                                        <div
                                                            className={`
                                                                w-6 h-6 rounded border-2 flex items-center justify-center mx-auto opacity-80 cursor-default
                                                                ${isChecked
                                                                    ? 'border-primary/80 bg-primary/80 text-white'
                                                                    : 'border-muted-foreground/10 bg-transparent'
                                                                }
                                                            `}
                                                        >
                                                            {isChecked && <Check className="w-3.5 h-3.5" />}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* File Watcher Settings (Tauri App) */}
            <FileWatcherCard />

            {/* Other Settings */}
            <Card>
                <CardContent className="p-6">
                    <div className="text-center py-4 text-muted-foreground">
                        <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <h3 className="text-sm font-medium mb-1">추가 설정</h3>
                        <p className="text-xs">Supabase, 스케줄 설정 — 개발 예정</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── File Watcher Card ───

function FileWatcherCard() {
    const { isTauriApp, watchStatus, addProject, removeProject, toggleAll, autoScanAndWatch, scanning, recentChanges, error } = useWatcher()
    const { projects } = useProjects()
    const [editingPath, setEditingPath] = useState<Record<string, string>>({})
    const [scanResult, setScanResult] = useState<string | null>(null)

    if (!isTauriApp) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Eye className="w-5 h-5" />
                        File Watcher
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-4 text-muted-foreground">
                        <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <h3 className="text-sm font-medium mb-1">데스크탑 앱 전용</h3>
                        <p className="text-xs">파일 감시 기능은 Orchestrator 데스크탑 앱에서만 사용 가능합니다.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const handleSetPath = async (repoFullName: string) => {
        const path = editingPath[repoFullName]
        if (!path) return
        await addProject(repoFullName, path)
        setEditingPath((prev) => {
            const next = { ...prev }
            delete next[repoFullName]
            return next
        })
    }

    const handleAutoScan = async () => {
        const repoUrls = projects.map((p) => p.repo_url)
        const count = await autoScanAndWatch(repoUrls)
        setScanResult(`${count}개 프로젝트 경로 자동 감지 완료`)
        setTimeout(() => setScanResult(null), 3000)
    }

    const watchingProjects = watchStatus?.projects ?? []

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Eye className="w-5 h-5" />
                        File Watcher
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        프로젝트 파일 변경을 실시간 감시합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={scanning}
                        onClick={() => void handleAutoScan()}
                    >
                        {scanning ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />스캔 중...</>
                        ) : (
                            '🔍 자동 스캔'
                        )}
                    </Button>
                    <Button
                        variant={watchStatus?.enabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => void toggleAll()}
                    >
                        {watchStatus?.enabled ? '⏸ 전체 중지' : '▶ 전체 시작'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {scanResult && (
                    <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2">
                        ✅ {scanResult}
                    </div>
                )}
                {error && (
                    <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
                        {error}
                    </div>
                )}

                {/* 프로젝트별 경로 설정 */}
                <div className="border rounded-lg divide-y">
                    {projects.map((project) => {
                        const wp = watchingProjects.find((w) => w.repo_full_name === project.repo_full_name)
                        const isEditing = editingPath[project.repo_full_name] !== undefined
                        return (
                            <div key={project.id} className="px-4 py-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{project.repo_name}</span>
                                        {wp?.watching ? (
                                            <Badge variant="default" className="text-[10px] h-4 bg-green-600">watching</Badge>
                                        ) : wp ? (
                                            <Badge variant="outline" className="text-[10px] h-4">stopped</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">경로 미설정</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {wp && (
                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={() => void removeProject(project.repo_full_name)}>
                                                해제
                                            </Button>
                                        )}
                                        {!isEditing && (
                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                                                onClick={() => setEditingPath((prev) => ({
                                                    ...prev,
                                                    [project.repo_full_name]: wp?.path ?? '',
                                                }))}
                                            >
                                                {wp ? '경로 변경' : '경로 설정'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {wp?.path && !isEditing && (
                                    <p className="text-[11px] text-muted-foreground font-mono truncate">{wp.path}</p>
                                )}
                                {isEditing && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 text-xs bg-muted/50 border rounded px-2 py-1.5 font-mono"
                                            placeholder="/Users/.../프로젝트경로"
                                            value={editingPath[project.repo_full_name] ?? ''}
                                            onChange={(e) => setEditingPath((prev) => ({ ...prev, [project.repo_full_name]: e.target.value }))}
                                            onKeyDown={(e) => { if (e.key === 'Enter') void handleSetPath(project.repo_full_name) }}
                                        />
                                        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => void handleSetPath(project.repo_full_name)}>
                                            <Check className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                            onClick={() => setEditingPath((prev) => {
                                                const next = { ...prev }
                                                delete next[project.repo_full_name]
                                                return next
                                            })}
                                        >
                                            취소
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    {projects.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            프로젝트를 먼저 import하세요
                        </div>
                    )}
                </div>

                {/* 최근 변경 로그 */}
                {recentChanges.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">최근 변경 ({recentChanges.length})</p>
                        <div className="border rounded-lg max-h-32 overflow-y-auto divide-y">
                            {recentChanges.slice(0, 10).map((c, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                                    <span className={`font-medium ${c.event_type === 'add' ? 'text-green-500' : c.event_type === 'unlink' ? 'text-red-500' : 'text-yellow-500'}`}>
                                        {c.event_type === 'add' ? '+' : c.event_type === 'unlink' ? '−' : '✎'}
                                    </span>
                                    <span className="truncate font-mono">{c.path}</span>
                                    {c.violation && <Badge variant="destructive" className="text-[9px] h-4">위반</Badge>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

