// ============================================
// useWorkItems — 작업 목록 조회 + 생성
// ============================================

import { useCallback, useEffect, useState } from 'react'
import type { WorkItemRow, WorkItemInsert } from '../types/database'
import type { WorkItemStatus } from '../types/index'
import { getWorkItems, createWorkItem } from '../lib/supabase/workItems'

interface UseWorkItemsReturn {
    items: WorkItemRow[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    addItem: (input: WorkItemInsert) => Promise<WorkItemRow>
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
        return created
    }, [])

    return { items, loading, error, refresh, addItem }
}

