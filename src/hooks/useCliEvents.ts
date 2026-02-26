// ========================================
// useCliEvents — CLI 이벤트 실시간 조회 훅
// 초기 로딩 + Supabase Realtime + Tauri 이벤트
// ========================================

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CliEventRow } from '../types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
    getCliEvents,
    subscribeCliEvents,
    unsubscribeCliEvents,
} from '../lib/supabase/cliEvents'

/** Tauri 환경인지 체크 */
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

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

    // Supabase 실시간 구독
    useEffect(() => {
        if (!realtime) return

        const channel = subscribeCliEvents((newEvent) => {
            if (eventType && newEvent.event_type !== eventType) return
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

    // Tauri orchx:file-change 이벤트 리스닝 (앱 전용, 실시간)
    useEffect(() => {
        if (!isTauri()) return

        console.log('[useCliEvents] Tauri orchx:file-change 리스너 등록 시작')
        let unlisten: (() => void) | null = null

        import('@tauri-apps/api/event').then(({ listen }) => {
            listen<{ path: string; event_type: string; violation: string | null }>('orchx:file-change', (event) => {
                const p = event.payload
                console.log('[useCliEvents] 📝 Tauri 이벤트 수신:', p.path, p.event_type)
                // CliEventRow 형식으로 변환하여 로컬 이벤트 목록에 추가
                const localEvent: CliEventRow = {
                    id: crypto.randomUUID(),
                    event_id: crypto.randomUUID(),
                    event_type: 'file.changed',
                    payload: { file: p.path, event_type: p.event_type, violation: p.violation },
                    created_at: new Date().toISOString(),
                    session_id: null,
                    project_id: null,
                    status: 'processed',
                    retry_count: 0,
                    processed_at: new Date().toISOString(),
                }
                if (eventType && localEvent.event_type !== eventType) return
                setEvents(prev => [localEvent, ...prev].slice(0, limit))
            }).then(fn => {
                unlisten = fn
                console.log('[useCliEvents] ✅ Tauri 리스너 등록 완료')
            })
        }).catch(err => {
            console.error('[useCliEvents] ❌ Tauri 리스너 등록 실패:', err)
        })

        return () => { unlisten?.() }
    }, [eventType, limit])

    return { events, loading, error, refresh }
}
