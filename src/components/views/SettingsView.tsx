// ============================================
// SettingsView — Settings + GitHub 연결 관리
// ============================================

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
    Settings,
    Database,
    Brain,
    Clock,
    Github,
    ExternalLink,
    Loader2,
    Unlink,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { useGitHub } from '../../hooks/useGitHub'

const REPOS_PER_PAGE = 5

export function SettingsView() {
    const {
        isConnected,
        username,
        loading,
        repos,
        connect,
        disconnect,
    } = useGitHub()

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

    // ─── 페이지네이션 계산 ───
    const totalPages = Math.max(1, Math.ceil(repos.length / REPOS_PER_PAGE))
    const pagedRepos = repos.slice(
        repoPage * REPOS_PER_PAGE,
        repoPage * REPOS_PER_PAGE + REPOS_PER_PAGE,
    )

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
                            {/* 연결 상태 */}
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

                                {/* 연결 해제 — 인앱 확인 */}
                                {confirmDisconnect ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground mr-1">해제할까요?</span>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={disconnecting}
                                            onClick={() => void handleDisconnect()}
                                        >
                                            {disconnecting ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                '확인'
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={disconnecting}
                                            onClick={() => setConfirmDisconnect(false)}
                                        >
                                            취소
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setConfirmDisconnect(true)}
                                    >
                                        <Unlink className="w-4 h-4 mr-1.5" />
                                        연결 해제
                                    </Button>
                                )}
                            </div>

                            {/* 레포 목록 — 5개/페이지 */}
                            {repos.length > 0 && (
                                <div>
                                    <div className="border rounded-lg divide-y" style={{ minHeight: `${REPOS_PER_PAGE * 45}px` }}>
                                        {pagedRepos.map((repo) => (
                                            <div key={repo.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                                                <span className="text-sm truncate mr-3">
                                                    {repo.full_name.includes('/') ? (
                                                        <>
                                                            <span className="text-muted-foreground">{repo.full_name.split('/')[0]}/</span>
                                                            <span className="font-medium bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-xs">{repo.full_name.split('/').slice(1).join('/')}</span>
                                                        </>
                                                    ) : (
                                                        <span className="font-medium">{repo.full_name}</span>
                                                    )}
                                                </span>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {repo.language && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{repo.language}</span>
                                                    )}
                                                    {repo.private && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400">private</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 페이지네이션 */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-2 px-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={repoPage === 0}
                                                onClick={() => setRepoPage((p) => p - 1)}
                                                className="h-7 px-2"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <span className="text-xs text-muted-foreground">
                                                {repoPage + 1} / {totalPages}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={repoPage >= totalPages - 1}
                                                onClick={() => setRepoPage((p) => p + 1)}
                                                className="h-7 px-2"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* 미연결 */
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

            {/* Other Settings */}
            <Card>
                <CardContent className="p-6">
                    <div className="text-center py-8 text-muted-foreground">
                        <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <h3 className="text-sm font-medium mb-1">추가 설정</h3>
                        <p className="text-xs">데이터베이스, AI 모델, 스케줄 설정</p>
                        <div className="mt-4 flex flex-wrap justify-center gap-3">
                            <Button variant="outline" size="sm" disabled>
                                <Database className="w-4 h-4 mr-2" />
                                Supabase
                            </Button>
                            <Button variant="outline" size="sm" disabled>
                                <Brain className="w-4 h-4 mr-2" />
                                LLM
                            </Button>
                            <Button variant="outline" size="sm" disabled>
                                <Clock className="w-4 h-4 mr-2" />
                                Schedule
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
