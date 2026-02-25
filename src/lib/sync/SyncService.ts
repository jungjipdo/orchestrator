// ============================================
// SyncService — 선택적 클라우드 동기화 서비스
// sync_consent ON일 때만 로컬 → Supabase 동기화
// ============================================

import { supabase } from '../supabase/client'
import { anonymizeForSync } from './anonymize'

/** Tauri 환경인지 체크 */
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

// 데이터 수집 동의 필요 테이블 (익명화 필수)
const DATA_COLLECTION_TABLES = ['event_logs', 'cli_events', 'agent_tasks', 'run_results']
// 동기화 동의 테이블 (그대로 전송)
const SYNC_TABLES = ['work_items', 'plans', 'goals', 'session_logs']

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

    // 1. 동의 상태 확인
    const syncConsent = await invoke<string | null>('db_get_preference', { key: 'sync_consent' })
    const dataConsent = await invoke<string | null>('db_get_preference', { key: 'data_collection_consent' })

    // 둘 다 OFF면 전송할 것 없음
    if (syncConsent !== 'true' && dataConsent !== 'true') {
        return 0
    }

    // 2. pending 큐 가져오기
    const pendingRaw = await invoke<SyncQueueItem[]>('db_get_pending_sync')
    const pending = Array.isArray(pendingRaw) ? pendingRaw : []
    if (pending.length === 0) return 0

    const syncedIds: number[] = []

    // 3. 각 항목 동의 상태별 + 익명화 처리 후 전송
    for (const item of pending) {
        try {
            // 동의 확인: 해당 테이블의 동의가 없으면 스킵
            if (DATA_COLLECTION_TABLES.includes(item.table_name) && dataConsent !== 'true') {
                syncedIds.push(item.id) // consent OFF → 전송 안 함, 큐에서 제거
                continue
            }
            if (SYNC_TABLES.includes(item.table_name) && syncConsent !== 'true') {
                syncedIds.push(item.id)
                continue
            }

            if (item.operation === 'insert' || item.operation === 'update') {
                // 데이터 수집 테이블은 익명화
                const payloadToSend = DATA_COLLECTION_TABLES.includes(item.table_name)
                    ? await anonymizeForSync(item.table_name, item.payload)
                    : item.payload

                if (!payloadToSend) continue // 익명화 실패

                const { error } = await supabase
                    .from(item.table_name)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .upsert(payloadToSend as any, { onConflict: 'id' })

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
