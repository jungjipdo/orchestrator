// ============================================
// useCliEvents — CLI 이벤트 실시간 조회 훅
// 초기 로딩 + Supabase Realtime 구독
// ============================================

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CliEventRow } from '../types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
    getCliEvents,
    subscribeCliEvents,
    unsubscribeCliEvents,
} from '../lib/supabase/cliEvents'

interface UseCliEventsReturn {
    events: CliEventRow[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
}

export function useCliEvents(options?: {
    eventType?: string
    limit?: number
    realtime?: boolean  // 기본: true
}): UseCliEventsReturn {
    const [events, setEvents] = useState<CliEventRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const channelRef = useRef<RealtimeChannel | null>(null)

    const eventType = options?.eventType
    const limit = options?.limit ?? 50
    const realtime = options?.realtime ?? true

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getCliEvents({ eventType, limit })
            setEvents(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'CLI 이벤트 로딩 실패')
        } finally {
            setLoading(false)
        }
    }, [eventType, limit])

    // 초기 로딩
    useEffect(() => {
        void refresh()
    }, [refresh])

    // 실시간 구독
    useEffect(() => {
        if (!realtime) return

        const channel = subscribeCliEvents((newEvent) => {
            // 타입 필터링
            if (eventType && newEvent.event_type !== eventType) return
            // 최신 이벤트를 상단에 추가
            setEvents(prev => [newEvent, ...prev].slice(0, limit))
        })

        channelRef.current = channel

        return () => {
            if (channelRef.current) {
                unsubscribeCliEvents(channelRef.current)
                channelRef.current = null
            }
        }
    }, [realtime, eventType, limit])

    return { events, loading, error, refresh }
}
