// ============================================
// useTheme — 다크/라이트 모드 전환 훅
// localStorage에 저장, <html>에 .dark 클래스 토글
// ============================================

import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'orchestrator-theme'

function getInitialTheme(): Theme {
    // 1. localStorage에 저장된 값
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored === 'light' || stored === 'dark') return stored

    // 2. OS 다크모드 설정
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'

    return 'light'
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme)

    // <html>에 .dark 클래스 동기화
    useEffect(() => {
        const root = document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        localStorage.setItem(STORAGE_KEY, theme)
    }, [theme])

    const toggleTheme = useCallback(() => {
        setThemeState(prev => prev === 'dark' ? 'light' : 'dark')
    }, [])

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t)
    }, [])

    return { theme, toggleTheme, setTheme, isDark: theme === 'dark' }
}
