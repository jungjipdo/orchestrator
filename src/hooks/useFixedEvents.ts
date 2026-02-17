// ============================================
// useFixedEvents — 고정 일정 조회 (읽기 전용)
// ⚠️ 쓰기는 commandExecutor를 통해서만 수행 (Contract C2)
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FixedEventRow } from '../types/database'
import { getFixedEvents, getTodayFixedEvents } from '../lib/supabase/fixedEvents'

interface UseFixedEventsReturn {
    events: FixedEventRow[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
}

export function useFixedEvents(options?: {
    todayOnly?: boolean
    from?: string
    to?: string
}): UseFixedEventsReturn {
    const [events, setEvents] = useState<FixedEventRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const stableOptions = useMemo(
        () => ({ todayOnly: options?.todayOnly, from: options?.from, to: options?.to }),
        [options?.todayOnly, options?.from, options?.to],
    )

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = stableOptions.todayOnly
                ? await getTodayFixedEvents()
                : await getFixedEvents({ from: stableOptions.from, to: stableOptions.to })
            setEvents(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '일정 로딩 실패')
        } finally {
            setLoading(false)
        }
    }, [stableOptions])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { events, loading, error, refresh }
}
