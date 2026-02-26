// ============================================
// LandingGuard — 랜딩 vs 앱 분기
// Tauri or PWA → /app 리다이렉트
// 웹 브라우저 → LandingPage 표시
// ============================================

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { isTauri } from '../../lib/tauri/isTauri'
import { LandingPage } from './LandingPage'

/**
 * PWA가 설치된 상태인지 감지.
 * display-mode: standalone = PWA installed
 */
function isPwaInstalled(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(display-mode: standalone)').matches
    )
}

export function LandingGuard() {
    const navigate = useNavigate()
    const [shouldShowLanding, setShouldShowLanding] = useState<boolean | null>(null)

    useEffect(() => {
        // Tauri 앱 or PWA → /app으로 즉시 리다이렉트
        if (isTauri() || isPwaInstalled()) {
            void navigate('/app', { replace: true })
            return
        }
        // 일반 웹 브라우저 → 랜딩페이지 표시
        setShouldShowLanding(true)
    }, [navigate])

    // 아직 판별 중
    if (shouldShowLanding === null) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ background: 'var(--body-gradient)' }}
            />
        )
    }

    return <LandingPage />
}
