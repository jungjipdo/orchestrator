import { supabase } from './client'
import { requireUserId } from './auth'
import type {
    FixedEventRow,
    FixedEventInsert,
    FixedEventUpdate,
} from '../../types/database'

// === Read ===

export async function getFixedEvents(options?: {
    from?: string   // ISO 8601 — 이 시점 이후 이벤트
    to?: string     // ISO 8601 — 이 시점 이전 이벤트
}) {
    let query = supabase
        .from('fixed_events')
        .select('*')
        .order('start_at', { ascending: true })

    if (options?.from) {
        query = query.gte('start_at', options.from)
    }
    if (options?.to) {
        query = query.lte('start_at', options.to)
    }

    const { data, error } = await query
    if (error) throw error
    return data as FixedEventRow[]
}

export async function getFixedEventById(id: string) {
    const { data, error } = await supabase
        .from('fixed_events')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data as FixedEventRow
}

// === Create ===

export async function createFixedEvent(event: FixedEventInsert) {
    const user_id = await requireUserId()
    const { data, error } = await supabase
        .from('fixed_events')
        .insert({ ...event, user_id })
        .select()
        .single()

    if (error) throw error
    return data as FixedEventRow
}

// === Update ===

export async function updateFixedEvent(id: string, updates: FixedEventUpdate) {
    const { data, error } = await supabase
        .from('fixed_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as FixedEventRow
}

// === Delete ===

export async function deleteFixedEvent(id: string) {
    const { error } = await supabase
        .from('fixed_events')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// === Helpers ===

/** 오늘의 고정 일정 조회 */
export async function getTodayFixedEvents() {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

    return getFixedEvents({ from: startOfDay, to: endOfDay })
}
