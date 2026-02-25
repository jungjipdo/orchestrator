// ============================================
// SyncService — 선택적 클라우드 동기화 서비스
// sync_consent ON일 때만 로컬 → Supabase 동기화
// ============================================

import { supabase } from '../supabase/client'

/** Tauri 환경인지 체크 */
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

interface SyncQueueItem {
    id: number
    table_name: string
    record_id: string
    operation: 'insert' | 'update' | 'delete'
    payload: Record<string, unknown>
    created_at: string
}

/**
 * 동기화 큐에서 pending 항목을 가져와 Supabase에 전송
 * @returns 동기화된 항목 수
 */
export async function processSyncQueue(): Promise<number> {
    if (!isTauri()) return 0

    const { invoke } = await import('@tauri-apps/api/core')

    // 1. sync_consent 확인
    const consent = await invoke<string | null>('db_get_preference', { key: 'sync_consent' })
    if (consent !== 'true') {
        return 0 // 동기화 미동의 → 스킵
    }

    // 2. pending 큐 가져오기
    const pendingRaw = await invoke<SyncQueueItem[]>('db_get_pending_sync')
    const pending = Array.isArray(pendingRaw) ? pendingRaw : []
    if (pending.length === 0) return 0

    const syncedIds: number[] = []

    // 3. 각 항목 Supabase에 전송
    for (const item of pending) {
        try {
            if (item.operation === 'insert' || item.operation === 'update') {
                const { error } = await supabase
                    .from(item.table_name)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .upsert(item.payload as any, { onConflict: 'id' })

                if (error) {
                    console.warn(`[Sync] ${item.table_name}/${item.record_id} 실패:`, error.message)
                    continue
                }
            } else if (item.operation === 'delete') {
                const { error } = await supabase
                    .from(item.table_name)
                    .delete()
                    .eq('id', item.record_id)

                if (error) {
                    console.warn(`[Sync] DELETE ${item.table_name}/${item.record_id} 실패:`, error.message)
                    continue
                }
            }

            syncedIds.push(item.id)
        } catch (err) {
            console.error(`[Sync] ${item.table_name}/${item.record_id} 에러:`, err)
        }
    }

    // 4. 성공한 항목 마킹
    if (syncedIds.length > 0) {
        await invoke('db_mark_synced', { queueIds: syncedIds })
        console.info(`[Sync] ${syncedIds.length}/${pending.length}개 동기화 완료`)
    }

    return syncedIds.length
}

/**
 * 주기적 동기화 시작 (5분 간격)
 */
export function startSyncInterval(intervalMs = 5 * 60 * 1000): () => void {
    if (!isTauri()) return () => { }

    // 앱 시작 후 30초 뒤 첫 동기화
    const initialTimeout = setTimeout(() => {
        void processSyncQueue()
    }, 30_000)

    // 이후 주기적 실행
    const interval = setInterval(() => {
        void processSyncQueue()
    }, intervalMs)

    // cleanup 함수 반환
    return () => {
        clearTimeout(initialTimeout)
        clearInterval(interval)
    }
}
