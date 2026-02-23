// ============================================
// cliEvents.ts — cli_events 테이블 CRUD + Realtime
// CLI에서 전송된 이벤트 조회 + 실시간 구독
// ============================================

import { supabase } from './client'
import type { CliEventRow } from '../../types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

// === Read ===

export async function getCliEvents(options?: {
    eventType?: string
    limit?: number
    since?: string  // ISO 8601
}) {
    let query = supabase
        .from('cli_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit ?? 100)

    if (options?.eventType) {
        query = query.eq('event_type', options.eventType)
    }

    if (options?.since) {
        query = query.gte('created_at', options.since)
    }

    const { data, error } = await query
    if (error) throw error
    return data as CliEventRow[]
}

// === Realtime 구독 ===

export function subscribeCliEvents(
    callback: (event: CliEventRow) => void,
): RealtimeChannel {
    const channel = supabase
        .channel('cli-events-realtime')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'cli_events',
            },
            (payload) => {
                callback(payload.new as CliEventRow)
            },
        )
        .subscribe()

    return channel
}

// === Unsubscribe ===

export function unsubscribeCliEvents(channel: RealtimeChannel): void {
    supabase.removeChannel(channel)
}
