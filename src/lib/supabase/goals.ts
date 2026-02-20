// ============================================
// goals.ts — Goals CRUD operations
// Project/Plan → Goal(목표) 계층의 중간 레이어
// ============================================

import { supabase } from './client'

// ─── 타입 ───

export type GoalRow = {
    id: string
    project_id: string | null
    plan_id: string | null
    title: string
    status: 'backlog' | 'active' | 'done' | 'deferred'
    priority: number
    description: string | null
    due_at: string | null
    created_at: string
    updated_at: string
}

export type GoalInsert = {
    project_id?: string | null
    plan_id?: string | null
    title: string
    status?: 'backlog' | 'active' | 'done' | 'deferred'
    priority?: number
    description?: string | null
    due_at?: string | null
}

export type GoalUpdate = {
    title?: string
    status?: 'backlog' | 'active' | 'done' | 'deferred'
    priority?: number
    description?: string | null
    due_at?: string | null
}

// ─── CRUD ───

export async function getGoals(filter?: {
    projectId?: string
    planId?: string
}): Promise<GoalRow[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
        .from('goals')
        .select('*')
        .order('priority', { ascending: true })

    if (filter?.projectId) {
        query = query.eq('project_id', filter.projectId)
    }
    if (filter?.planId) {
        query = query.eq('plan_id', filter.planId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as GoalRow[]
}

export async function createGoal(goal: GoalInsert): Promise<GoalRow> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('goals')
        .insert(goal)
        .select()
        .single()
    if (error) throw error
    return data as GoalRow
}

export async function updateGoal(id: string, updates: GoalUpdate): Promise<GoalRow> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('goals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data as GoalRow
}

export async function deleteGoal(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('goals')
        .delete()
        .eq('id', id)
    if (error) throw error
}
