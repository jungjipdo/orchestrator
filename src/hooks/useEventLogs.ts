// ============================================
// useEventLogs — 이벤트 로그 조회 (읽기 전용)
// ============================================

import { useCallback, useEffect, useState } from 'react'
import type { EventLogRow } from '../types/database'
import { getEventLogs } from '../lib/supabase/eventLogs'

interface UseEventLogsReturn {
    logs: EventLogRow[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
}

export function useEventLogs(options?: {
    eventType?: string
    limit?: number
    since?: string  // ISO 8601 — 이 날짜 이후 로그만 반환
}): UseEventLogsReturn {
    const [logs, setLogs] = useState<EventLogRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const eventType = options?.eventType
    const limit = options?.limit
    const since = options?.since

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getEventLogs({ eventType, limit, since })
            setLogs(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '이벤트 로그 로딩 실패')
        } finally {
            setLoading(false)
        }
    }, [eventType, limit, since])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { logs, loading, error, refresh }
}
