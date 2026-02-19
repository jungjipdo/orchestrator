// ============================================
// useAuth — Supabase Auth (GitHub OAuth)
// 로그인/로그아웃 + 세션 관리
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

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
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin,
            },
        })
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
