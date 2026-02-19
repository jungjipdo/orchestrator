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
} from 'lucide-react'
import { useGitHub } from '../../hooks/useGitHub'
import { useModelScores, type ModelScoreEntry } from '../../hooks/useModelScores'
import { useEditorModels } from '../../hooks/useEditorModels'
import type { AIModel, EditorType } from '../../types/index'

const ALL_MODELS: { key: AIModel; label: string; short: string }[] = [
    { key: 'claude_opus_4_6', label: 'Claude Opus 4.6', short: 'Opus' },
    { key: 'claude_sonnet_4_6', label: 'Claude Sonnet 4.6', short: 'Sonnet' },
    { key: 'gpt_5_3_codex', label: 'GPT-5.3-Codex', short: 'GPT-5' },
    { key: 'gpt_5_3_codex_spark', label: 'Codex-Spark', short: 'Spark' },
    { key: 'gemini_3_pro', label: 'Gemini 3 Pro', short: 'Pro' },
    { key: 'gemini_3_flash', label: 'Gemini 3 Flash', short: 'Flash' },
    { key: 'gemini_3_deep_think', label: 'Gemini Deep Think', short: 'Think' },
]

const ALL_EDITORS: { type: EditorType; label: string }[] = [
    { type: 'cursor', label: 'Cursor' },
    { type: 'claude_code', label: 'Claude Code' },
    { type: 'codex', label: 'Codex' },
    { type: 'antigravity', label: 'Antigravity' },
    { type: 'vscode', label: 'VS Code' },
    { type: 'terminal', label: 'Terminal' },
    { type: 'windsurf', label: 'Windsurf' },
    { type: 'zed', label: 'Zed' },
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
    const { editorModels, updateModels } = useEditorModels()

    const [repoPage, setRepoPage] = useState(0)
    const [confirmDisconnect, setConfirmDisconnect] = useState(false)
    const [disconnecting, setDisconnecting] = useState(false)

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

    // ─── 에디터 모델 토글 핸들러 ───
    const handleToggleModel = (editorType: EditorType, modelKey: AIModel) => {
        const current = editorModels.find(e => e.editorType === editorType)
        const currentModels = current?.supportedModels ?? []
        const newModels = currentModels.includes(modelKey)
            ? currentModels.filter(m => m !== modelKey)
            : [...currentModels, modelKey]
        void updateModels(editorType, newModels)
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
                            {repos.length > 0 && (
                                <div>
                                    <div className="border rounded-lg divide-y">
                                        {pagedRepos.map((repo) => (
                                            <div key={repo.id} className="flex items-center justify-between px-4 py-3">
                                                <span className="text-base truncate mr-3">
                                                    {repo.full_name.includes('/') ? (
                                                        <>
                                                            <span className="text-foreground">{repo.full_name.split('/')[0]}/</span>
                                                            <span className="font-semibold bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded text-red-600 dark:text-red-400 font-mono text-sm">{repo.full_name.split('/').slice(1).join('/')}</span>
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
                                                        <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400">private</span>
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
                <CardHeader>
                    <CardTitle className="text-base">AI Model Scoring</CardTitle>
                    <p className="text-xs text-muted-foreground">각 모델의 카테고리별 성능 점수 (0-100). AI 추천 시 높은 점수 모델이 우선됩니다.</p>
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
                                            {ALL_MODELS.find(m => m.key === entry.model_key)?.label ?? entry.model_key}
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
                                                    <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">
                                                        {getScoreValue(entry.model_key, cat)}
                                                    </span>
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
                    <p className="text-xs text-muted-foreground">에디터별 지원 모델을 설정합니다. AI 분석 시 선택된 에디터의 모델만 사용됩니다.</p>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 pr-4 font-medium">Editor</th>
                                    {ALL_MODELS.map(m => (
                                        <th key={m.key} className="text-center py-2 px-1 font-medium text-xs min-w-[70px]">
                                            {m.short}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ALL_EDITORS.map(editor => {
                                    const entry = editorModels.find(e => e.editorType === editor.type)
                                    const models = entry?.supportedModels ?? []
                                    return (
                                        <tr key={editor.type} className="border-b last:border-0">
                                            <td className="py-3 pr-4 font-medium text-xs">{editor.label}</td>
                                            {ALL_MODELS.map(m => {
                                                const isChecked = models.includes(m.key)
                                                return (
                                                    <td key={m.key} className="py-3 px-1 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleModel(editor.type, m.key)}
                                                            className={`
                                                                w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer
                                                                ${isChecked
                                                                    ? 'border-primary bg-primary text-white'
                                                                    : 'border-muted-foreground/20 hover:border-primary/50'
                                                                }
                                                            `}
                                                        >
                                                            {isChecked && <Check className="w-3.5 h-3.5" />}
                                                        </button>
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
