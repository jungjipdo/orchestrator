// ============================================
// plans.ts — plans 테이블 CRUD
// ============================================

import { supabase } from './client'
import { requireUserId } from './auth'
import type {
    PlanRow,
    PlanInsert,
    PlanUpdate,
} from '../../types/database'
import type { PlanType, PlanStatus } from '../../types/index'

// === Read ===

export async function getPlans(options?: {
    type?: PlanType
    status?: PlanStatus
    limit?: number
}) {
    let query = supabase
        .from('plans')
        .select('*')
        .order('created_at', { ascending: false })

    if (options?.type) {
        query = query.eq('plan_type', options.type)
    }
    if (options?.status) {
        query = query.eq('status', options.status)
    }
    if (options?.limit) {
        query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data as PlanRow[]
}

export async function getPlanById(id: string) {
    const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data as PlanRow
}

/** due_at이 있는 plan 조회 (Timeline 연동용) */
export async function getPlansWithDueDate(options?: {
    from?: string
    to?: string
}) {
    let query = supabase
        .from('plans')
        .select('*')
        .not('due_at', 'is', null)
        .order('due_at', { ascending: true })

    if (options?.from) {
        query = query.gte('due_at', options.from)
    }
    if (options?.to) {
        query = query.lte('due_at', options.to)
    }

    const { data, error } = await query
    if (error) throw error
    return data as PlanRow[]
}

// === Create ===

export async function createPlan(plan: PlanInsert) {
    const user_id = await requireUserId()
    const { data, error } = await supabase
        .from('plans')
        .insert({ ...plan, user_id })
        .select()
        .single()

    if (error) throw error
    return data as PlanRow
}

// === Update ===

export async function updatePlan(id: string, updates: PlanUpdate) {
    const { data, error } = await supabase
        .from('plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as PlanRow
}

// === Delete ===

export async function deletePlan(id: string) {
    const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id)

    if (error) throw error
}
