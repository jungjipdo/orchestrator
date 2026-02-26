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
    syncGitHubWithToken,
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
    const syncGitHub = useCallback(async (providerToken: string) => {
        try {

            await syncGitHubWithToken(providerToken)

        } catch (e) {
            console.error('[GitHub] sync 실패:', e)
        }
    }, [])

    // Supabase auth 세션 변경 구독
    // ⚡ 핵심: Supabase JS가 hash(#access_token=...&provider_token=gho_...)를 먼저 파싱하고
    //         onAuthStateChange 콜백에서 session.provider_token으로 전달함.
    //         useEffect보다 먼저 실행되므로, 여기서 provider_token을 잡아야 함.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {

            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.provider_token) {
                // GitHub OAuth 직후 → provider_token으로 sync
                void syncGitHub(session.provider_token).then(() => {
                    // hash 정리
                    if (window.location.hash) {
                        window.history.replaceState({}, '', window.location.pathname)
                    }
                    void refresh()
                })
            } else if (event === 'SIGNED_IN') {
                void refresh()
            }
        })
        return () => subscription.unsubscribe()
    }, [syncGitHub, refresh])

    // ─── GitHub OAuth를 외부 브라우저/내부 리디렉트 분기 ───
    const triggerOAuth = useCallback(async (scopes?: string) => {
        const { isTauri, openInExternalBrowser, startOAuthServer, onOAuthCallback } = await import('../lib/tauri/openExternal')
        const origin = window.location.origin

        if (isTauri()) {
            // Tauri: PKCE + 로컬 콜백 서버
            const callbackUrl = await startOAuthServer()

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: callbackUrl,
                    scopes: scopes ?? 'repo,read:user',
                    skipBrowserRedirect: true,
                },
            })

            if (data?.url && !error) {
                onOAuthCallback(async (code) => {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                    if (exchangeError) {
                        console.error('[GitHub] 세션 교환 실패:', exchangeError)
                    }
                })
                await openInExternalBrowser(data.url)
            }
        } else {
            // PWA: 기존 리디렉트 방식
            void supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: origin,
                    scopes: scopes ?? 'repo,read:user',
                },
            })
        }
    }, [])

    // ─── GitHub 연결 (Supabase Auth OAuth) ───
    const connect = useCallback(() => {
        void triggerOAuth('repo,read:user')
    }, [triggerOAuth])

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
                void triggerOAuth('repo,read:user')
            })
        } else {
            void triggerOAuth('repo,read:user')
        }
    }, [connection, triggerOAuth])

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
