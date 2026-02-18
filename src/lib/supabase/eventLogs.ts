// ============================================
// eventLogs.ts — event_logs 테이블 CRUD
// 이벤트 파이프라인 로그 기록
// ============================================

import { supabase } from './client'
import type {
    EventLogRow,
    EventLogInsert,
} from '../../types/database'

// === Read ===

export async function getEventLogs(options?: {
    eventType?: string
    limit?: number
    since?: string  // ISO 8601 — 이 날짜 이후 로그만 반환
}) {
    let query = supabase
        .from('event_logs')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(options?.limit ?? 500)

    if (options?.eventType) {
        query = query.eq('event_type', options.eventType)
    }

    if (options?.since) {
        query = query.gte('triggered_at', options.since)
    }

    const { data, error } = await query
    if (error) throw error
    return data as EventLogRow[]
}

// === Create (이벤트 기록) ===

export async function logEvent(
    eventType: string,
    payload: Record<string, unknown> = {},
    actor: 'user' | 'system' | 'ai' = 'system',
): Promise<EventLogRow> {
    const insert: EventLogInsert = {
        event_type: eventType,
        payload,
        triggered_at: new Date().toISOString(),
        applied_at: null,
        actor,
    }

    const { data, error } = await supabase
        .from('event_logs')
        .insert(insert)
        .select()
        .single()

    if (error) throw error
    return data as EventLogRow
}

// === Update (이벤트 적용 완료 마킹) ===

export async function markEventApplied(eventId: string): Promise<EventLogRow> {
    const { data, error } = await supabase
        .from('event_logs')
        .update({ applied_at: new Date().toISOString() })
        .eq('id', eventId)
        .select()
        .single()

    if (error) throw error
    return data as EventLogRow
}
