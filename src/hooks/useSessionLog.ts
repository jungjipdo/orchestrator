// ============================================
// useSessionLog — 현재 세션 조회 (읽기 전용)
// ⚠️ start/end는 commandExecutor (/focus, /close)를 통해서만 수행 (Contract C2)
// ============================================

import { useState, useEffect, useCallback } from 'react'
import type { SessionLogRow } from '../types/database'
import { getActiveSession } from '../lib/supabase/sessionLogs'

interface UseSessionLogReturn {
    activeSession: SessionLogRow | null
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
}

export function useSessionLog(): UseSessionLogReturn {
    const [activeSession, setActiveSession] = useState<SessionLogRow | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const session = await getActiveSession()
            setActiveSession(session)
        } catch (err) {
            setError(err instanceof Error ? err.message : '세션 로딩 실패')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { activeSession, loading, error, refresh }
}
