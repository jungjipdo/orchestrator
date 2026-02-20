// ============================================
// useGoals — Goals 상태 관리 훅
// Project/Plan 하위 Goal CRUD + 진척률 계산
// ============================================

import { useState, useCallback, useEffect } from 'react'
import {
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    type GoalRow,
    type GoalInsert,
    type GoalUpdate,
} from '../lib/supabase/goals'

interface UseGoalsReturn {
    goals: GoalRow[]
    loading: boolean
    addGoal: (goal: GoalInsert) => Promise<GoalRow>
    editGoal: (id: string, updates: GoalUpdate) => Promise<void>
    removeGoal: (id: string) => Promise<void>
    refresh: () => Promise<void>
}

export function useGoals(filter?: {
    projectId?: string
    planId?: string
}): UseGoalsReturn {
    const [goals, setGoals] = useState<GoalRow[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getGoals(filter)
            setGoals(data)
        } catch (err) {
            console.error('Failed to fetch goals:', err)
        } finally {
            setLoading(false)
        }
    }, [filter?.projectId, filter?.planId])

    useEffect(() => {
        void refresh()
    }, [refresh])

    const addGoal = useCallback(async (goal: GoalInsert): Promise<GoalRow> => {
        const created = await createGoal(goal)
        setGoals(prev => [...prev, created])
        return created
    }, [])

    const editGoal = useCallback(async (id: string, updates: GoalUpdate) => {
        const updated = await updateGoal(id, updates)
        setGoals(prev => prev.map(g => g.id === id ? updated : g))
    }, [])

    const removeGoal = useCallback(async (id: string) => {
        await deleteGoal(id)
        setGoals(prev => prev.filter(g => g.id !== id))
    }, [])

    return { goals, loading, addGoal, editGoal, removeGoal, refresh }
}
