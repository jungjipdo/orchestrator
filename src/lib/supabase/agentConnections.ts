// ============================================
// agentConnections.ts — Supabase CRUD
// 에디터 등록 + Agent Tasks + Run Results
// ============================================

import { supabase } from './client'
import { requireUserId } from './auth'
import type {
    AgentConnectionRow,
    AgentConnectionInsert,
    AgentConnectionUpdate,
    AgentTaskRow,
    AgentTaskInsert,
    AgentTaskUpdate,
    RunResultRow,
    RunResultInsert,
} from '../../types/database'
import type { EditorType } from '../../types/index'

// === 에디터 등록 (Agent Connections) ===

export async function getAgentConnections(): Promise<AgentConnectionRow[]> {
    const user_id = await requireUserId()
    const { data, error } = await supabase
        .from('agent_connections')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as AgentConnectionRow[]
}

export async function toggleEditor(editorType: EditorType): Promise<void> {
    const user_id = await requireUserId()

    // 이미 등록되어 있으면 삭제, 아니면 추가
    const { data: existing } = await supabase
        .from('agent_connections')
        .select('id')
        .eq('user_id', user_id)
        .eq('editor_type', editorType)
        .maybeSingle()

    if (existing) {
        await supabase.from('agent_connections').delete().eq('id', existing.id)
    } else {
        await supabase
            .from('agent_connections')
            .insert({ user_id, editor_type: editorType })
    }
}

export async function createAgentConnection(
    conn: AgentConnectionInsert,
): Promise<AgentConnectionRow> {
    const user_id = await requireUserId()
    const { data, error } = await supabase
        .from('agent_connections')
        .insert({ ...conn, user_id })
        .select()
        .single()

    if (error) throw error
    return data as AgentConnectionRow
}

export async function updateAgentConnection(
    id: string,
    updates: AgentConnectionUpdate,
): Promise<AgentConnectionRow> {
    const { data, error } = await supabase
        .from('agent_connections')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as AgentConnectionRow
}

export async function deleteAgentConnection(id: string): Promise<void> {
    const { error } = await supabase
        .from('agent_connections')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// === Agent Tasks ===

export async function getAgentTasks(
    connectionId?: string,
): Promise<AgentTaskRow[]> {
    const user_id = await requireUserId()
    let query = supabase
        .from('agent_tasks')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

    if (connectionId) {
        query = query.eq('agent_connection_id', connectionId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as AgentTaskRow[]
}

export async function createAgentTask(
    task: AgentTaskInsert,
): Promise<AgentTaskRow> {
    const user_id = await requireUserId()
    const { data, error } = await supabase
        .from('agent_tasks')
        .insert({ ...task, user_id })
        .select()
        .single()

    if (error) throw error
    return data as AgentTaskRow
}

export async function updateAgentTask(
    id: string,
    updates: AgentTaskUpdate,
): Promise<AgentTaskRow> {
    const { data, error } = await supabase
        .from('agent_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as AgentTaskRow
}

export async function deleteAgentTask(id: string): Promise<void> {
    const { error } = await supabase
        .from('agent_tasks')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// === Run Results ===

export async function getRunResults(
    taskId: string,
): Promise<RunResultRow[]> {
    const { data, error } = await supabase
        .from('run_results')
        .select('*')
        .eq('agent_task_id', taskId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as RunResultRow[]
}

export async function createRunResult(
    result: RunResultInsert,
): Promise<RunResultRow> {
    const { data, error } = await supabase
        .from('run_results')
        .insert(result)
        .select()
        .single()

    if (error) throw error
    return data as RunResultRow
}

// === 통계 ===

export async function getModelStats(): Promise<{
    model: string
    total_tasks: number
    completed: number
    failed: number
}[]> {
    const user_id = await requireUserId()

    const { data: tasks, error } = await supabase
        .from('agent_tasks')
        .select('recommended_model, status')
        .eq('user_id', user_id)

    if (error) throw error
    if (!tasks?.length) return []

    const statsMap = new Map<string, { total_tasks: number; completed: number; failed: number }>()

    for (const task of tasks) {
        const model = (task.recommended_model as string) ?? 'unknown'
        const stat = statsMap.get(model) ?? { total_tasks: 0, completed: 0, failed: 0 }
        stat.total_tasks++
        if (task.status === 'completed') stat.completed++
        if (task.status === 'failed') stat.failed++
        statsMap.set(model, stat)
    }

    return Array.from(statsMap.entries()).map(([model, stat]) => ({ model, ...stat }))
}
