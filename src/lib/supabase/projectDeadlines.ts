// ============================================
// projectDeadlines.ts — project_deadlines 테이블 CRUD
// 스케줄러 입력에 필수
// ============================================

import { supabase } from './client'
import type {
    ProjectDeadlineRow,
    ProjectDeadlineInsert,
    ProjectDeadlineUpdate,
} from '../../types/database'

// === Read ===

export async function getProjectDeadlines(projectId?: string) {
    let query = supabase
        .from('project_deadlines')
        .select('*')
        .order('deadline_at', { ascending: true })

    if (projectId) {
        query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    if (error) throw error
    return data as ProjectDeadlineRow[]
}

export async function getProjectDeadlineById(id: string) {
    const { data, error } = await supabase
        .from('project_deadlines')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data as ProjectDeadlineRow
}

/** 임박한 마감 조회 (N일 이내) */
export async function getUpcomingDeadlines(withinDays: number = 7) {
    const now = new Date()
    const future = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
        .from('project_deadlines')
        .select('*')
        .gte('deadline_at', now.toISOString())
        .lte('deadline_at', future.toISOString())
        .order('deadline_at', { ascending: true })

    if (error) throw error
    return data as ProjectDeadlineRow[]
}

// === Create ===

export async function createProjectDeadline(deadline: ProjectDeadlineInsert) {
    const { data, error } = await supabase
        .from('project_deadlines')
        .insert(deadline)
        .select()
        .single()

    if (error) throw error
    return data as ProjectDeadlineRow
}

// === Update ===

export async function updateProjectDeadline(id: string, updates: ProjectDeadlineUpdate) {
    const { data, error } = await supabase
        .from('project_deadlines')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as ProjectDeadlineRow
}

// === Delete ===

export async function deleteProjectDeadline(id: string) {
    const { error } = await supabase
        .from('project_deadlines')
        .delete()
        .eq('id', id)

    if (error) throw error
}
