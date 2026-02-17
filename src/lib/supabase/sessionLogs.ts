// ============================================
// sessionLogs.ts — session_logs 테이블 CRUD
// /focus → /close 세션 라이프사이클 관리
// ============================================

import { supabase } from './client'
import type {
    SessionLogRow,
    SessionLogInsert,
    SessionLogUpdate,
} from '../../types/database'

// === Read ===

export async function getSessionLogs(workItemId?: string) {
    let query = supabase
        .from('session_logs')
        .select('*')
        .order('started_at', { ascending: false })

    if (workItemId) {
        query = query.eq('work_item_id', workItemId)
    }

    const { data, error } = await query
    if (error) throw error
    return data as SessionLogRow[]
}

/** 현재 진행 중인 세션 (ended_at이 null) */
export async function getActiveSession() {
    const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw error
    return data as SessionLogRow | null
}

// === Create (세션 시작) ===

export async function startSession(workItemId: string): Promise<SessionLogRow> {
    // 이미 활성 세션이 있으면 에러
    const active = await getActiveSession()
    if (active) {
        throw new Error(
            `이미 진행 중인 세션이 있습니다 (work_item_id: ${active.work_item_id}). 먼저 /close 하세요.`
        )
    }

    const insert: SessionLogInsert = {
        work_item_id: workItemId,
        started_at: new Date().toISOString(),
        ended_at: null,
        result: null,
        done_log: null,
    }

    const { data, error } = await supabase
        .from('session_logs')
        .insert(insert)
        .select()
        .single()

    if (error) throw error
    return data as SessionLogRow
}

// === Update (세션 종료) ===

export async function endSession(
    sessionId: string,
    updates: SessionLogUpdate,
): Promise<SessionLogRow> {
    // done_log 필수 검증 (AI 의사결정 규칙 #4)
    if (updates.result === 'done' && !updates.done_log) {
        throw new Error('done_log가 없으면 세션을 완료할 수 없습니다.')
    }

    const { data, error } = await supabase
        .from('session_logs')
        .update({
            ...updates,
            ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single()

    if (error) throw error
    return data as SessionLogRow
}
