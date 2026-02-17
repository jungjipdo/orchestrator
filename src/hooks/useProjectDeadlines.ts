// ============================================
// useProjectDeadlines — 프로젝트 마감 조회 Hook
// ============================================

import { useState, useEffect, useCallback } from 'react'
import type { ProjectDeadlineRow, ProjectDeadlineInsert } from '../types/database'
import { getProjectDeadlines, getUpcomingDeadlines, createProjectDeadline, deleteProjectDeadline } from '../lib/supabase/projectDeadlines'

interface UseProjectDeadlinesReturn {
    deadlines: ProjectDeadlineRow[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    add: (deadline: ProjectDeadlineInsert) => Promise<ProjectDeadlineRow>
    remove: (id: string) => Promise<void>
}

export function useProjectDeadlines(options?: {
    projectId?: string
    upcomingDays?: number
}): UseProjectDeadlinesReturn {
    const [deadlines, setDeadlines] = useState<ProjectDeadlineRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = options?.upcomingDays
                ? await getUpcomingDeadlines(options.upcomingDays)
                : await getProjectDeadlines(options?.projectId)
            setDeadlines(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '마감 로딩 실패')
        } finally {
            setLoading(false)
        }
    }, [options?.projectId, options?.upcomingDays])

    useEffect(() => {
        void refresh()
    }, [refresh])

    const add = useCallback(async (deadline: ProjectDeadlineInsert) => {
        const created = await createProjectDeadline(deadline)
        await refresh()
        return created
    }, [refresh])

    const remove = useCallback(async (id: string) => {
        await deleteProjectDeadline(id)
        await refresh()
    }, [refresh])

    return { deadlines, loading, error, refresh, add, remove }
}
