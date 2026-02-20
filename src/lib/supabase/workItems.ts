import { supabase } from './client'
import { requireUserId } from './auth'
import type {
    WorkItemRow,
    WorkItemInsert,
    WorkItemUpdate,
} from '../../types/database'
import type { WorkItemStatus } from '../../types/index'

// === Read ===

export interface GetWorkItemsFilter {
    status?: WorkItemStatus
    includeDeleted?: boolean
}

export async function getWorkItems(filter?: GetWorkItemsFilter) {
    let query = supabase
        .from('work_items')
        .select('*')
        .order('created_at', { ascending: false })

    // soft delete 필터 (기본: 삭제된 항목 제외)
    if (!filter?.includeDeleted) {
        query = query.is('deleted_at', null)
    }

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
    const user_id = await requireUserId()
    const { data, error } = await supabase
        .from('work_items')
        .insert({ ...item, user_id })
        .select()
        .single()

    if (error) throw error
    return data as WorkItemRow
}

// === Update (with lifecycle timestamp auto-fill) ===

export async function updateWorkItem(id: string, updates: WorkItemUpdate) {
    // 상태 변경 시 수명주기 타임스탬프 자동 갱신
    if (updates.status) {
        const enriched = { ...updates }

        if (updates.status === 'active' && !updates.started_at) {
            // active 전환 → started_at 최초 1회만 기록
            const current = await getWorkItemById(id)
            if (!current.started_at) {
                enriched.started_at = new Date().toISOString()
            }
        }

        if (updates.status === 'done' && !updates.completed_at) {
            enriched.completed_at = new Date().toISOString()

            // actual_min 자동 계산 (started_at이 있는 경우)
            if (!updates.actual_min) {
                const current = await getWorkItemById(id)
                if (current.started_at) {
                    const started = new Date(current.started_at).getTime()
                    const completed = new Date(enriched.completed_at).getTime()
                    enriched.actual_min = Math.round((completed - started) / 60000)
                }
            }
        }

        const { data, error } = await supabase
            .from('work_items')
            .update(enriched)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as WorkItemRow
    }

    // 일반 업데이트 (상태 변경 아닌 경우)
    const { data, error } = await supabase
        .from('work_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as WorkItemRow
}

// === Soft Delete ===

export async function deleteWorkItem(id: string) {
    const { error } = await supabase
        .from('work_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw error
}

// === Restore (soft delete 복구) ===

export async function restoreWorkItem(id: string) {
    const { data, error } = await supabase
        .from('work_items')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as WorkItemRow
}
