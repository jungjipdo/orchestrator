// ============================================
// usePlans — plans 조회 + 생성 훅
// Event 타입: fixed_events 동시 생성으로 Timeline 연동
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { PlanRow } from '../types/database'
import type { PlanType, PlanStatus, PlanFormData, EventMetadata } from '../types/index'
import {
    getPlans,
    createPlan as createPlanApi,
    updatePlan as updatePlanApi,
    deletePlan as deletePlanApi,
    getPlanById,
} from '../lib/supabase/plans'
import { createFixedEvent, deleteFixedEvent } from '../lib/supabase/fixedEvents'
import { logEvent } from '../lib/supabase/eventLogs'

interface UsePlansOptions {
    type?: PlanType
    status?: PlanStatus
    limit?: number
}

interface UsePlansReturn {
    plans: PlanRow[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    createPlan: (formData: PlanFormData) => Promise<PlanRow>
    updatePlan: (id: string, updates: Partial<PlanFormData> & { status?: string }) => Promise<PlanRow>
    deletePlan: (id: string) => Promise<void>
}

export function usePlans(options?: UsePlansOptions): UsePlansReturn {
    const [plans, setPlans] = useState<PlanRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const stableOptions = useMemo(
        () => ({ type: options?.type, status: options?.status, limit: options?.limit }),
        [options?.type, options?.status, options?.limit],
    )

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getPlans(stableOptions)
            setPlans(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Plan 로딩 실패')
        } finally {
            setLoading(false)
        }
    }, [stableOptions])

    useEffect(() => {
        void refresh()
    }, [refresh])

    /**
     * Plan 생성 — 타입별 metadata 구성 + (Event면) fixed_events 동시 생성
     */
    const createPlan = useCallback(async (formData: PlanFormData): Promise<PlanRow> => {
        // 타입별 metadata 구성
        let metadata: Record<string, unknown> = {}

        switch (formData.plan_type) {
            case 'task': {
                if (formData.description) {
                    metadata = { goals: formData.description }
                }
                break
            }
            case 'event': {
                const startDateTime = formData.start_at && formData.start_time
                    ? `${formData.start_at}T${formData.start_time}:00`
                    : formData.start_at

                const endDateTime = formData.start_at && formData.end_time
                    ? `${formData.start_at}T${formData.end_time}:00`
                    : undefined

                const eventMeta: EventMetadata = {
                    start_at: startDateTime ? new Date(startDateTime).toISOString() : new Date().toISOString(),
                    end_at: endDateTime ? new Date(endDateTime).toISOString() : undefined,
                    location: formData.location || undefined,
                    reminders: formData.reminders,
                }

                // fixed_events에 동시 생성 (Timeline 연동)
                if (startDateTime) {
                    const fixedEvent = await createFixedEvent({
                        title: formData.title,
                        start_at: new Date(startDateTime).toISOString(),
                        end_at: endDateTime
                            ? new Date(endDateTime).toISOString()
                            : new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString(), // 기본 1시간
                        importance: formData.priority === 'critical' ? 'critical'
                            : formData.priority === 'high' ? 'high'
                                : 'medium',
                    })
                    eventMeta.fixed_event_id = fixedEvent.id
                }

                metadata = eventMeta as unknown as Record<string, unknown>
                break
            }
            case 'project': {
                metadata = {
                    git_repo: formData.git_repo || undefined,
                    goals: formData.description || undefined,
                }
                break
            }
        }

        const plan = await createPlanApi({
            title: formData.title,
            plan_type: formData.plan_type,
            status: 'backlog',
            priority: formData.priority || null,
            description: formData.description || null,
            due_at: formData.due_at ? new Date(formData.due_at).toISOString() : null,
            metadata,
        })

        // event_logs에 기록 → LogView에 표시
        await logEvent(
            'plan.created',
            {
                plan_id: plan.id,
                plan_type: formData.plan_type,
                title: formData.title,
                priority: formData.priority,
            },
            'user',
        )

        // 리스트 갱신
        await refresh()
        return plan
    }, [refresh])

    /**
     * Plan 수정
     */
    const updatePlan = useCallback(async (id: string, updates: Partial<PlanFormData> & { status?: string; metadata?: Record<string, unknown> }): Promise<PlanRow> => {
        const updateData: Record<string, unknown> = {}
        if (updates.title !== undefined) updateData.title = updates.title
        if (updates.priority !== undefined) updateData.priority = updates.priority
        if (updates.description !== undefined) updateData.description = updates.description
        if (updates.due_at !== undefined) updateData.due_at = updates.due_at ? new Date(updates.due_at).toISOString() : null
        if (updates.status !== undefined) updateData.status = updates.status
        if (updates.metadata !== undefined) updateData.metadata = updates.metadata
        const plan = await updatePlanApi(id, updateData)

        await logEvent(
            'plan.updated',
            { plan_id: id, updates: Object.keys(updateData) },
            'user',
        )

        await refresh()
        return plan
    }, [refresh])

    /**
     * Plan 삭제 — Event 타입이면 fixed_events도 동시 삭제
     */
    const deletePlan = useCallback(async (id: string): Promise<void> => {
        // 삭제 전 plan 조회 → Event면 fixed_event_id 확인
        const plan = await getPlanById(id)
        const meta = plan.metadata as Record<string, unknown>

        // Event 타입이고 fixed_event_id가 있으면 동시 삭제
        if (plan.plan_type === 'event' && meta.fixed_event_id) {
            try {
                await deleteFixedEvent(meta.fixed_event_id as string)
            } catch {
                // fixed_event가 이미 삭제된 경우 무시
            }
        }

        await deletePlanApi(id)

        await logEvent(
            'plan.deleted',
            { plan_id: id, plan_type: plan.plan_type, title: plan.title },
            'user',
        )

        await refresh()
    }, [refresh])

    return { plans, loading, error, refresh, createPlan, updatePlan, deletePlan }
}
