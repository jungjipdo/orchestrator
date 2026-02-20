// ============================================
// useWorkItems — 작업 목록 조회 + 생성
// ============================================

import { useCallback, useEffect, useState } from 'react'
import type { WorkItemRow, WorkItemInsert, WorkItemUpdate } from '../types/database'
import type { WorkItemStatus } from '../types/index'
import { getWorkItems, createWorkItem, updateWorkItem, deleteWorkItem } from '../lib/supabase/workItems'
import { logEvent } from '../lib/supabase/eventLogs'
import { getTransitionError } from '../lib/domain/workItemTransitions'

interface UseWorkItemsReturn {
    items: WorkItemRow[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    addItem: (input: WorkItemInsert) => Promise<WorkItemRow>
    updateItem: (id: string, updates: WorkItemUpdate) => Promise<WorkItemRow>
    removeItem: (id: string) => Promise<void>
}

export function useWorkItems(filter?: { status?: WorkItemStatus }): UseWorkItemsReturn {
    const [items, setItems] = useState<WorkItemRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const status = filter?.status

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getWorkItems(status ? { status } : undefined)
            setItems(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '작업 목록 로딩 실패')
        } finally {
            setLoading(false)
        }
    }, [status])

    useEffect(() => {
        void refresh()
    }, [refresh])

    const addItem = useCallback(async (input: WorkItemInsert) => {
        const created = await createWorkItem(input)
        setItems(prev => [created, ...prev])
        logEvent('work_item_created', {
            id: created.id,
            title: created.title,
            status: created.status,
            project_id: created.project_id,
            source_app: created.source_app,
        }, 'user').catch(console.error)
        return created
    }, [])

    const updateItem = useCallback(async (id: string, updates: WorkItemUpdate) => {
        const prev = items.find(i => i.id === id)

        // 상태 전이 유효성 검증
        if (updates.status && prev) {
            const err = getTransitionError(prev.status, updates.status as WorkItemStatus)
            if (err) {
                throw new Error(err)
            }
        }

        const updated = await updateWorkItem(id, updates)
        setItems(p => p.map(i => i.id === id ? updated : i))

        if (updates.status && prev && prev.status !== updates.status) {
            logEvent('work_item_status_changed', {
                id,
                from: prev.status,
                to: updates.status,
            }, 'user').catch(console.error)
        } else {
            logEvent('work_item_updated', { id, updates: Object.keys(updates) }, 'user').catch(console.error)
        }
        return updated
    }, [items])

    const removeItem = useCallback(async (id: string) => {
        await deleteWorkItem(id)
        // soft delete: UI에서도 제거 (deleted_at이 찍힘)
        setItems(prev => prev.filter(i => i.id !== id))
        logEvent('work_item_deleted', { id }, 'user').catch(console.error)
    }, [])

    return { items, loading, error, refresh, addItem, updateItem, removeItem }
}

