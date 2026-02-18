// ============================================
// useProjectGitHub — 프로젝트별 GitHub 데이터 훅
// Issues, PRs, Commits를 가져오고 실시간 갱신
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GitHubCommit, GitHubPR, GitHubIssue } from '../lib/github/githubApi'
import { listIssues, listPRs, listCommits, listBranches } from '../lib/github/githubApi'
import type { GitHubBranch } from '../lib/github/githubApi'

interface UseProjectGitHubOptions {
    /** GitHub access token */
    token: string | null
    /** 레포 전체 이름 (e.g. "owner/repo") */
    repoFullName: string | null
    /** 자동 갱신 간격 (ms), 0이면 비활성 */
    pollInterval?: number
    /** 초기 활성화 여부 */
    enabled?: boolean
}

interface UseProjectGitHubReturn {
    // Data
    issues: GitHubIssue[]
    prs: GitHubPR[]
    commits: GitHubCommit[]
    branches: GitHubBranch[]
    selectedBranch: string
    setSelectedBranch: (branch: string) => void

    // Stats
    openIssueCount: number
    openPRCount: number

    // Loading
    loading: boolean
    error: string | null
    lastUpdated: Date | null

    // Actions
    refresh: () => Promise<void>
}

const DEFAULT_POLL_INTERVAL = 60_000 // 1분

export function useProjectGitHub(options: UseProjectGitHubOptions): UseProjectGitHubReturn {
    const { token, repoFullName, pollInterval = DEFAULT_POLL_INTERVAL, enabled = true } = options

    const [issues, setIssues] = useState<GitHubIssue[]>([])
    const [prs, setPRs] = useState<GitHubPR[]>([])
    const [commits, setCommits] = useState<GitHubCommit[]>([])
    const [branches, setBranches] = useState<GitHubBranch[]>([])
    const [selectedBranch, setSelectedBranch] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // owner/repo 분리
    const [owner, repo] = repoFullName?.split('/') ?? [null, null]

    const refresh = useCallback(async () => {
        if (!token || !owner || !repo) return

        try {
            setLoading(true)
            setError(null)

            const branch = selectedBranch || undefined

            const [issueList, prList, commitList, branchList] = await Promise.all([
                listIssues(token, owner, repo, 'open', 30),
                listPRs(token, owner, repo, 'open', 30),
                listCommits(token, owner, repo, branch, 20),
                branches.length === 0 ? listBranches(token, owner, repo) : Promise.resolve(branches),
            ])

            setIssues(issueList)
            setPRs(prList)
            setCommits(commitList)
            if (branches.length === 0) {
                setBranches(branchList)
                // default branch 설정
                if (!selectedBranch && branchList.length > 0) {
                    const main = branchList.find(b => b.name === 'main') ?? branchList[0]
                    setSelectedBranch(main.name)
                }
            }
            setLastUpdated(new Date())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'GitHub 데이터 로딩 실패')
        } finally {
            setLoading(false)
        }
    }, [token, owner, repo, selectedBranch, branches])

    // 초기 로딩 + enabled 변경 시
    useEffect(() => {
        if (enabled && token && repoFullName) {
            void refresh()
        }
    }, [enabled, token, repoFullName]) // eslint-disable-line react-hooks/exhaustive-deps

    // 브랜치 변경 시 커밋 갱신
    useEffect(() => {
        if (enabled && token && owner && repo && selectedBranch) {
            void (async () => {
                try {
                    const commitList = await listCommits(token, owner, repo, selectedBranch, 20)
                    setCommits(commitList)
                } catch (err) {
                    console.error('커밋 갱신 실패:', err)
                }
            })()
        }
    }, [selectedBranch]) // eslint-disable-line react-hooks/exhaustive-deps

    // Polling (실시간 갱신)
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }

        if (enabled && pollInterval > 0 && token && repoFullName) {
            intervalRef.current = setInterval(() => {
                void refresh()
            }, pollInterval)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [enabled, pollInterval, token, repoFullName, refresh])

    return {
        issues,
        prs,
        commits,
        branches,
        selectedBranch,
        setSelectedBranch,
        openIssueCount: issues.length,
        openPRCount: prs.length,
        loading,
        error,
        lastUpdated,
        refresh,
    }
}
