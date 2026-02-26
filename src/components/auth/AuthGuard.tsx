// ============================================
// AuthGuard — 인증 가드 컴포넌트
// 미인증 → LoginPage, 인증 → children
// ============================================

import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { LoginPage } from './LoginPage'

interface AuthGuardProps {
    children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--body-gradient)' }}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-500 ease-out fill-mode-forwards">
                <LoginPage />
            </div>
        )
    }

    return (
        <div className="animate-in fade-in zoom-in-95 duration-500 ease-out fill-mode-forwards h-full">
            {children}
        </div>
    )
}
