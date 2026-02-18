// ============================================
// ProjectGitHubPanel — 프로젝트 상세 GitHub 패널
// 커밋 히스토리 + Issues/PRs 요약 + 브랜치 선택
// GitHub Desktop 스타일 커밋 리스트
// ============================================

import { useMemo } from 'react'
import { useProjectGitHub } from '../../hooks/useProjectGitHub'
import { Badge } from '../ui/badge'
import {
    GitCommit,
    GitPullRequest,
    AlertCircle,
    RefreshCw,
    GitBranch,
    Clock,
    User,
    ExternalLink,
    Loader2,
} from 'lucide-react'

interface Props {
    repoFullName: string
    token: string | null
}

/** 커밋 메시지에서 첫 줄(제목)만 추출 */
function commitTitle(message: string): string {
    return message.split('\n')[0].slice(0, 80)
}

/** 커밋 메시지에서 Conventional Commit prefix 감지 */
function commitPrefix(message: string): { label: string; color: string } | null {
    const title = commitTitle(message).toLowerCase()
    if (title.startsWith('feat')) return { label: 'feat', color: 'bg-green-100 text-green-700' }
    if (title.startsWith('fix')) return { label: 'fix', color: 'bg-red-100 text-red-700' }
    if (title.startsWith('refactor')) return { label: 'refactor', color: 'bg-blue-100 text-blue-700' }
    if (title.startsWith('chore')) return { label: 'chore', color: 'bg-gray-100 text-gray-700' }
    if (title.startsWith('style')) return { label: 'style', color: 'bg-purple-100 text-purple-700' }
    if (title.startsWith('test')) return { label: 'test', color: 'bg-yellow-100 text-yellow-700' }
    if (title.startsWith('docs')) return { label: 'docs', color: 'bg-cyan-100 text-cyan-700' }
    if (title.startsWith('ci')) return { label: 'ci', color: 'bg-orange-100 text-orange-700' }
    return null
}

/** 상대 시간 (한국어) */
function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '방금 전'
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}일 전`
    return new Date(dateStr).toLocaleDateString('ko-KR')
}

export function ProjectGitHubPanel({ repoFullName, token }: Props) {
    const {
        issues,
        prs,
        commits,
        branches,
        selectedBranch,
        setSelectedBranch,
        openIssueCount,
        openPRCount,
        loading,
        error,
        lastUpdated,
        refresh,
    } = useProjectGitHub({
        token,
        repoFullName,
        pollInterval: 60_000, // 1분 자동 갱신
        enabled: true,
    })

    // 커밋 날짜별 그룹화
    const commitsByDate = useMemo(() => {
        const groups = new Map<string, typeof commits>()
        commits.forEach(c => {
            const date = new Date(c.commit.author.date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            if (!groups.has(date)) groups.set(date, [])
            groups.get(date)!.push(c)
        })
        return Array.from(groups.entries())
    }, [commits])

    if (error) {
        return (
            <div className="mt-3 pt-3 border-t border-border/50 p-4 text-center text-sm text-destructive">
                <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                <p>{error}</p>
                <button
                    type="button"
                    onClick={() => void refresh()}
                    className="mt-2 text-xs text-primary hover:underline cursor-pointer"
                >
                    다시 시도
                </button>
            </div>
        )
    }

    return (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-4">
            {/* Summary Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-sm">
                    {/* Issues */}
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{openIssueCount}</span>
                        <span className="text-muted-foreground">issues</span>
                    </div>
                    {/* PRs */}
                    <div className="flex items-center gap-1.5">
                        <GitPullRequest className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">{openPRCount}</span>
                        <span className="text-muted-foreground">PRs</span>
                    </div>
                    {/* Commits */}
                    <div className="flex items-center gap-1.5">
                        <GitCommit className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{commits.length}</span>
                        <span className="text-muted-foreground">commits</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Branch Selector */}
                    {branches.length > 0 && (
                        <div className="flex items-center gap-1.5 text-sm">
                            <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="text-xs bg-transparent border border-border rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {branches.map(b => (
                                    <option key={b.name} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Refresh */}
                    <button
                        type="button"
                        onClick={() => void refresh()}
                        className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                        title={lastUpdated ? `마지막 갱신: ${lastUpdated.toLocaleTimeString('ko-KR')}` : '갱신'}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Open PRs (간략) */}
            {prs.length > 0 && (
                <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Open Pull Requests
                    </h4>
                    {prs.slice(0, 5).map(pr => (
                        <a
                            key={pr.id}
                            href={`https://github.com/${repoFullName}/pull/${pr.number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors group"
                        >
                            <GitPullRequest className={`w-4 h-4 shrink-0 ${pr.draft ? 'text-gray-400' : 'text-green-600'}`} />
                            <span className="text-sm truncate flex-1 group-hover:text-primary transition-colors">
                                #{pr.number} {pr.title}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                                <span className="text-green-600">+{pr.additions ?? 0}</span>
                                <span className="text-red-600">-{pr.deletions ?? 0}</span>
                            </div>
                            {pr.draft && <Badge variant="outline" className="text-xs">draft</Badge>}
                            <span className="text-xs text-muted-foreground">{pr.head.ref}</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    ))}
                </div>
            )}

            {/* Open Issues (요약) */}
            {issues.length > 0 && (
                <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Open Issues
                    </h4>
                    {issues.slice(0, 5).map(issue => (
                        <a
                            key={issue.id}
                            href={`https://github.com/${repoFullName}/issues/${issue.number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors group"
                        >
                            <AlertCircle className="w-4 h-4 text-green-600 shrink-0" />
                            <span className="text-sm truncate flex-1 group-hover:text-primary transition-colors">
                                #{issue.number} {issue.title}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap shrink-0">
                                {issue.labels.slice(0, 3).map(label => (
                                    <span
                                        key={label.name}
                                        className="text-xs px-1.5 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: `#${label.color}20`,
                                            color: `#${label.color}`,
                                        }}
                                    >
                                        {label.name}
                                    </span>
                                ))}
                            </div>
                            {issue.comments > 0 && (
                                <span className="text-xs text-muted-foreground">💬{issue.comments}</span>
                            )}
                        </a>
                    ))}
                </div>
            )}

            {/* Commit History — GitHub Desktop 스타일 */}
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent Commits
                </h4>

                {loading && commits.length === 0 ? (
                    <div className="py-8 flex items-center justify-center text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        <span className="text-sm">Loading commits...</span>
                    </div>
                ) : commits.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        커밋이 없습니다
                    </div>
                ) : (
                    commitsByDate.map(([date, dateCommits]) => (
                        <div key={date}>
                            {/* Date Header */}
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">{date}</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* Commits for this date */}
                            <div className="space-y-0.5 ml-1 border-l-2 border-border/50 pl-4">
                                {dateCommits.map(commit => {
                                    const prefix = commitPrefix(commit.commit.message)
                                    return (
                                        <a
                                            key={commit.sha}
                                            href={commit.html_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start gap-3 p-2 -ml-[21px] rounded hover:bg-muted/50 transition-colors group"
                                        >
                                            {/* Commit dot */}
                                            <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-primary/60 border-2 border-background shrink-0" />

                                            {/* Avatar */}
                                            {commit.author?.avatar_url ? (
                                                <img
                                                    src={commit.author.avatar_url}
                                                    alt={commit.author.login}
                                                    className="w-6 h-6 rounded-full shrink-0 mt-0.5"
                                                />
                                            ) : (
                                                <User className="w-6 h-6 text-muted-foreground shrink-0 mt-0.5" />
                                            )}

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {prefix && (
                                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${prefix.color}`}>
                                                            {prefix.label}
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                        {prefix
                                                            ? commitTitle(commit.commit.message).replace(/^[a-z]+[:(]?\s*/i, '')
                                                            : commitTitle(commit.commit.message)
                                                        }
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                                    <span>{commit.author?.login ?? commit.commit.author.name}</span>
                                                    <span>·</span>
                                                    <span>{relativeTime(commit.commit.author.date)}</span>
                                                    <span className="font-mono opacity-60">{commit.sha.slice(0, 7)}</span>
                                                </div>
                                            </div>
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Last Updated */}
            {lastUpdated && (
                <div className="text-xs text-muted-foreground text-right">
                    마지막 갱신: {lastUpdated.toLocaleTimeString('ko-KR')} · 1분마다 자동 갱신
                </div>
            )}
        </div>
    )
}
