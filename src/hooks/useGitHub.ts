// ============================================
// useGitHub — GitHub 연결 상태 + 레포 조회 훅
// ============================================

import { useState, useEffect, useCallback } from 'react'
import type { GitHubConnection, GitHubRepo } from '../lib/github/githubApi'
import {
    getGitHubConnection,
    disconnectGitHub as disconnectApi,
    listRepos,
    getGitHubInstallUrl,
} from '../lib/github/githubApi'

interface UseGitHubReturn {
    // 연결 상태
    isConnected: boolean
    connection: GitHubConnection | null
    username: string | null
    loading: boolean
    error: string | null

    // 레포
    repos: GitHubRepo[]
    reposLoading: boolean

    // 액션
    connect: () => void
    disconnect: () => Promise<void>
    refreshRepos: () => Promise<void>
    refresh: () => Promise<void>
}

export function useGitHub(): UseGitHubReturn {
    const [connection, setConnection] = useState<GitHubConnection | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [repos, setRepos] = useState<GitHubRepo[]>([])
    const [reposLoading, setReposLoading] = useState(false)

    // ─── 연결 정보 조회 ───
    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const conn = await getGitHubConnection()
            setConnection(conn)

            // 연결돼 있으면 레포도 자동 로드
            if (conn) {
                setReposLoading(true)
                try {
                    const repoList = await listRepos(conn.access_token)
                    setRepos(repoList)
                } catch (e) {
                    console.error('GitHub repos 로딩 실패:', e)
                    setRepos([])
                } finally {
                    setReposLoading(false)
                }
            } else {
                setRepos([])
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'GitHub 연결 확인 실패')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    // URL에 ?github=connected 있으면 자동 refresh
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('github') === 'connected') {
            // URL 정리
            const url = new URL(window.location.href)
            url.searchParams.delete('github')
            window.history.replaceState({}, '', url.toString())
            // 데이터 갱신
            void refresh()
        }
    }, [refresh])

    // ─── GitHub App Install 페이지로 이동 ───
    const connect = useCallback(() => {
        window.location.href = getGitHubInstallUrl()
    }, [])

    // ─── 연결 해제 ───
    const disconnect = useCallback(async () => {
        if (!connection) return
        await disconnectApi(connection.id)
        setConnection(null)
        setRepos([])
    }, [connection])

    // ─── 레포 새로고침 ───
    const refreshRepos = useCallback(async () => {
        if (!connection) return
        setReposLoading(true)
        try {
            const repoList = await listRepos(connection.access_token)
            setRepos(repoList)
        } catch (e) {
            console.error('GitHub repos 새로고침 실패:', e)
        } finally {
            setReposLoading(false)
        }
    }, [connection])

    return {
        isConnected: !!connection,
        connection,
        username: connection?.github_username ?? null,
        loading,
        error,
        repos,
        reposLoading,
        connect,
        disconnect,
        refreshRepos,
        refresh,
    }
}
