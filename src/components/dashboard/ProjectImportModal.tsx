// ============================================
// ProjectImportModal — GitHub 레포 → 프로젝트 import
// 레포 선택(필수) → 자동 프로젝트 생성
// ============================================

import { useState, useMemo, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '../ui/button'
import {
    X,
    Github,
    Search,
    Loader2,
    ExternalLink,
    Check,
    AlertCircle,
} from 'lucide-react'
import { useGitHub } from '../../hooks/useGitHub'
import type { GitHubRepo } from '../../lib/github/githubApi'
import type { CreateProjectInput } from '../../lib/supabase/projects'

// ─── Props ───
interface ProjectImportModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (input: CreateProjectInput) => Promise<void>
    /** 이미 import된 repo_id 목록 */
    importedRepoIds: Set<number>
}

export function ProjectImportModal({
    open,
    onOpenChange,
    onImport,
    importedRepoIds,
}: ProjectImportModalProps) {
    const { isConnected, repos, reposLoading, connect } = useGitHub()
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<GitHubRepo | null>(null)
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 검색 필터
    const filteredRepos = useMemo(() => {
        if (!search.trim()) return repos
        const q = search.toLowerCase()
        return repos.filter(
            (r) =>
                r.full_name.toLowerCase().includes(q) ||
                (r.description?.toLowerCase().includes(q) ?? false),
        )
    }, [repos, search])

    // import 핸들러
    const handleImport = useCallback(async () => {
        if (!selected) return

        setError(null)
        setImporting(true)
        try {
            await onImport({
                repo_id: selected.id,
                repo_name: selected.name,
                repo_full_name: selected.full_name,
                repo_url: selected.html_url,
                description: selected.description,
                default_branch: selected.default_branch,
                language: selected.language,
                is_private: selected.private,
            })
            onOpenChange(false)
            setSelected(null)
            setSearch('')
        } catch (e) {
            setError(e instanceof Error ? e.message : '프로젝트 생성 실패')
        } finally {
            setImporting(false)
        }
    }, [selected, onImport, onOpenChange])

    // 모달 닫힐 때 초기화
    const handleOpenChange = (v: boolean) => {
        if (!v) {
            setSelected(null)
            setSearch('')
            setError(null)
        }
        onOpenChange(v)
    }

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-xl shadow-xl w-[480px] max-h-[80vh] overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b">
                        <Dialog.Title className="flex items-center gap-2 text-base font-semibold">
                            <Github className="w-5 h-5" />
                            Import Project
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <X className="w-4 h-4" />
                            </Button>
                        </Dialog.Close>
                    </div>

                    <div className="p-5">
                        {!isConnected ? (
                            /* ─── 미연결 상태 ─── */
                            <div className="text-center py-8">
                                <Github className="w-14 h-14 mx-auto mb-4 text-muted-foreground/40" />
                                <h3 className="font-medium mb-1">GitHub 연결 필요</h3>
                                <p className="text-sm text-muted-foreground mb-5">
                                    GitHub를 연결하면 레포를 프로젝트로 가져올 수 있습니다
                                </p>
                                <Button onClick={connect}>
                                    <Github className="w-4 h-4 mr-2" />
                                    GitHub 연결하기
                                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </div>
                        ) : (
                            /* ─── 레포 선택 ─── */
                            <div className="space-y-4">
                                {/* 검색 */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="레포 검색..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        autoFocus
                                    />
                                </div>

                                {/* 레포 리스트 */}
                                <div className="border rounded-lg divide-y max-h-[340px] overflow-y-auto">
                                    {reposLoading ? (
                                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            레포 불러오는 중...
                                        </div>
                                    ) : filteredRepos.length === 0 ? (
                                        <div className="py-8 text-center text-sm text-muted-foreground">
                                            검색 결과가 없습니다
                                        </div>
                                    ) : (
                                        filteredRepos.map((repo) => {
                                            const isImported = importedRepoIds.has(repo.id)
                                            const isSelected = selected?.id === repo.id

                                            return (
                                                <button
                                                    key={repo.id}
                                                    type="button"
                                                    disabled={isImported}
                                                    onClick={() => setSelected(isSelected ? null : repo)}
                                                    className={`w-full text-left px-3 py-2.5 transition-colors ${isImported
                                                            ? 'bg-muted/50 opacity-50 cursor-not-allowed'
                                                            : isSelected
                                                                ? 'bg-primary/5 ring-1 ring-primary/30'
                                                                : 'hover:bg-muted/50'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="min-w-0 flex-1 mr-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-sm font-medium truncate">
                                                                    {repo.full_name}
                                                                </span>
                                                                {isImported && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-400 shrink-0">
                                                                        imported
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {repo.description && (
                                                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                                    {repo.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {repo.language && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                                                                    {repo.language}
                                                                </span>
                                                            )}
                                                            {repo.private && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-700 dark:text-yellow-400">
                                                                    private
                                                                </span>
                                                            )}
                                                            {isSelected && (
                                                                <Check className="w-4 h-4 text-primary" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })
                                    )}
                                </div>

                                {/* 에러 */}
                                {error && (
                                    <div className="flex items-center gap-2 text-sm text-destructive">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                {/* Import 버튼 */}
                                <div className="flex justify-end gap-2 pt-1">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleOpenChange(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        disabled={!selected || importing}
                                        onClick={() => void handleImport()}
                                    >
                                        {importing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <Github className="w-4 h-4 mr-2" />
                                                Import Project
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
