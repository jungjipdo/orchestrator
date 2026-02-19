// ============================================
// useGitHub — GitHub 연결 상태 + 레포 조회 훅
// Supabase Auth OAuth 플로우 사용
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import type { GitHubConnection, GitHubRepo } from '../lib/github/githubApi'
import {
    getGitHubConnection,
    disconnectGitHub as disconnectApi,
    syncGitHubFromSession,
    listRepos,
} from '../lib/github/githubApi'

interface UseGitHubReturn {
    // 연결 상태
    isConnected: boolean
    connection: GitHubConnection | null
    username: string | null
    loading: boolean
    error: string | null
    tokenExpired: boolean

    // 레포
    repos: GitHubRepo[]
    reposLoading: boolean

    // 액션
    connect: () => void
    disconnect: () => Promise<void>
    reconnect: () => void
    refreshRepos: () => Promise<void>
    refresh: () => Promise<void>
}

export function useGitHub(): UseGitHubReturn {
    const [connection, setConnection] = useState<GitHubConnection | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [repos, setRepos] = useState<GitHubRepo[]>([])
    const [reposLoading, setReposLoading] = useState(false)
    const [tokenExpired, setTokenExpired] = useState(false)

    // ─── 연결 정보 조회 ───
    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setTokenExpired(false)
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

    // ─── OAuth 후 provider_token → github_connections 동기화 ───
    const syncGitHub = useCallback(async () => {
        try {
            await syncGitHubFromSession()
        } catch (e) {
            console.error('GitHub sync 실패:', e)
        }
    }, [])

    // URL에 auth hash 있으면 (OAuth 리다이렉트 후) → sync + refresh
    useEffect(() => {
        const hash = window.location.hash
        if (hash && (hash.includes('access_token') || hash.includes('refresh_token'))) {
            // Supabase OAuth 콜백 후 → URL 정리
            window.history.replaceState({}, '', window.location.pathname)
            // provider_token → github_connections 자동 저장
            void syncGitHub().then(() => refresh())
        }
    }, [refresh])

    // Supabase auth 세션 변경 구독 → GitHub identity 추가 시 자동 sync
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                void syncGitHub().then(() => refresh())
            }
        })
        return () => subscription.unsubscribe()
    }, [refresh])

    // ─── GitHub 연결 (Supabase Auth OAuth) ───
    const connect = useCallback(() => {
        const origin = window.location.origin
        void supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: origin,
                scopes: 'repo,read:user',
            },
        })
    }, [])

    // ─── 연결 해제 ───
    const disconnect = useCallback(async () => {
        if (!connection) return
        await disconnectApi(connection.id)
        setConnection(null)
        setRepos([])
    }, [connection])

    // ─── 토큰 만료 시 재연결 ───
    const reconnect = useCallback(() => {
        if (connection) {
            void disconnectApi(connection.id).then(() => {
                setConnection(null)
                setRepos([])
                setTokenExpired(false)
                const origin = window.location.origin
                void supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: {
                        redirectTo: origin,
                        scopes: 'repo,read:user',
                    },
                })
            })
        } else {
            const origin = window.location.origin
            void supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: origin,
                    scopes: 'repo,read:user',
                },
            })
        }
    }, [connection])

    // ─── github:token-expired 이벤트 구독 ───
    useEffect(() => {
        const handler = () => {
            setTokenExpired(true)
            setError('GitHub 토큰이 만료되었습니다. 재연결이 필요합니다.')
        }
        window.addEventListener('github:token-expired', handler)
        return () => window.removeEventListener('github:token-expired', handler)
    }, [])

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
        tokenExpired,
        repos,
        reposLoading,
        connect,
        disconnect,
        reconnect,
        refreshRepos,
        refresh,
    }
}
