// ============================================
// useAuth — Supabase Auth (GitHub OAuth)
// PWA: 기존 implicit flow / Tauri: PKCE + 로컬 콜백 서버
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { isTauri, openInExternalBrowser, startOAuthServer, onOAuthCallback } from '../lib/tauri/openExternal'

interface UseAuthReturn {
    user: User | null
    session: Session | null
    loading: boolean
    signInWithGitHub: () => Promise<void>
    signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // 초기 세션 확인
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s)
            setUser(s?.user ?? null)
            setLoading(false)
        }).catch((err) => {
            console.warn('[Auth] 세션 확인 실패 (env 누락 가능):', err)
            setLoading(false)
        })

        // Auth 상태 변화 구독
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, s) => {
                setSession(s)
                setUser(s?.user ?? null)
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const signInWithGitHub = useCallback(async () => {
        if (isTauri()) {
            // ─── Tauri Desktop: PKCE + 로컬 콜백 서버 ───
            // 1. Rust에서 로컬 콜백 서버 시작 → callback URL 획득
            const callbackUrl = await startOAuthServer()

            // 2. Supabase OAuth URL 생성 (PKCE + skipBrowserRedirect)
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: callbackUrl,
                    skipBrowserRedirect: true,
                },
            })

            if (error || !data?.url) {
                console.error('[Auth] OAuth URL 생성 실패:', error)
                return
            }

            // 3. Chrome에서 code 수신 대기
            onOAuthCallback(async (code) => {
                try {
                    // 4. code → 세션 교환
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                    if (exchangeError) {
                        console.error('[Auth] 세션 교환 실패:', exchangeError)
                    }
                } catch (err) {
                    console.error('[Auth] 세션 교환 에러:', err)
                }
            })

            // 5. 외부 브라우저(Chrome)에서 GitHub 인증 페이지 열기
            await openInExternalBrowser(data.url)
        } else {
            // ─── PWA: 기존 리디렉트 방식 ───
            await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${window.location.origin}/app`,
                },
            })
        }
    }, [])

    const signOut = useCallback(async () => {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
    }, [])

    return {
        user,
        session,
        loading,
        signInWithGitHub,
        signOut,
    }
}
