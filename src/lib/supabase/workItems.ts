// ============================================
// workItems.ts — work_items 테이블 CRUD + 상태 전이
// ============================================

import { supabase } from './client'
import type {
    WorkItemRow,
    WorkItemInsert,
    WorkItemUpdate,
} from '../../types/database'
import type { WorkItemStatus } from '../../types/index'

// === Read ===

export async function getWorkItems(filter?: { status?: WorkItemStatus }) {
    let query = supabase
        .from('work_items')
        .select('*')
        .order('created_at', { ascending: false })

    if (filter?.status) {
        query = query.eq('status', filter.status)
    }

    const { data, error } = await query
    if (error) throw error
    return data as WorkItemRow[]
}

export async function getWorkItemById(id: string) {
    const { data, error } = await supabase
        .from('work_items')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data as WorkItemRow
}

// === Create ===

export async function createWorkItem(item: WorkItemInsert) {
    const { data, error } = await supabase
        .from('work_items')
        .insert(item)
        .select()
        .single()

    if (error) throw error
    return data as WorkItemRow
}

// === Update ===

export async function updateWorkItem(id: string, updates: WorkItemUpdate) {
    const { data, error } = await supabase
        .from('work_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as WorkItemRow
}

// === Delete ===

export async function deleteWorkItem(id: string) {
    const { error } = await supabase
        .from('work_items')
        .delete()
        .eq('id', id)

    if (error) throw error
}
