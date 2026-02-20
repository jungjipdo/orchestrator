// ============================================
// computeMetrics.ts — 9종 운영 지표 계산
// work_items + event_logs 기반 실시간 집계
// ============================================

import { supabase } from '../supabase/client'
import { requireUserId } from '../supabase/auth'
import type { WorkItemRow } from '../../types/database'

// === 타입 정의 ===

export interface MetricSnapshot {
    throughput: number
    avgCycleTimeMin: number | null
    avgLeadTimeMin: number | null
    estimateAccuracy: number | null
    wipCount: number
    agingWipCount: number
    blockedCount: number
    createdCount: number
    deletedCount: number
    reopenCount: number
    topSource: string | null
    aiModelDistribution: Record<string, number>
}

export interface MetricSnapshotRow {
    id: string
    user_id: string
    project_id: string | null
    period_type: 'daily' | 'weekly'
    period_start: string
    throughput: number
    avg_cycle_time_min: number | null
    avg_lead_time_min: number | null
    estimate_accuracy: number | null
    wip_count: number
    aging_wip_count: number
    blocked_count: number
    created_count: number
    deleted_count: number
    reopen_count: number
    top_source: string | null
    ai_model_distribution: Record<string, number>
    created_at: string
}

// === 핵심 집계 함수 ===

/**
 * 주어진 기간의 지표를 work_items에서 직접 계산
 * @param periodStart - 기간 시작 (ISO date string, ex: '2026-02-20')
 * @param periodEnd - 기간 끝 (ISO date string, ex: '2026-02-21')
 * @param projectId - 특정 프로젝트만 집계 (null이면 전체)
 */
export async function computeMetrics(
    periodStart: string,
    periodEnd: string,
    projectId?: string | null,
): Promise<MetricSnapshot> {
    // 해당 기간 내 모든 작업 가져오기 (삭제 포함)
    let query = supabase
        .from('work_items')
        .select('*')

    if (projectId) {
        query = query.eq('project_id', projectId)
    }

    const { data: items, error } = await query
    if (error) throw error
    const allItems = (items ?? []) as WorkItemRow[]

    // 1. Throughput: 기간 내 completed_at이 있는 건수
    const completed = allItems.filter(i =>
        i.completed_at &&
        i.completed_at >= periodStart &&
        i.completed_at < periodEnd
    )
    const throughput = completed.length

    // 2. Avg Cycle Time: completed_at - started_at (분)
    const cycleTimes = completed
        .filter(i => i.started_at && i.completed_at)
        .map(i => {
            const start = new Date(i.started_at!).getTime()
            const end = new Date(i.completed_at!).getTime()
            return (end - start) / 60000
        })
    const avgCycleTimeMin = cycleTimes.length > 0
        ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
        : null

    // 3. Avg Lead Time: completed_at - created_at (분)
    const leadTimes = completed
        .filter(i => i.completed_at)
        .map(i => {
            const created = new Date(i.created_at).getTime()
            const end = new Date(i.completed_at!).getTime()
            return (end - created) / 60000
        })
    const avgLeadTimeMin = leadTimes.length > 0
        ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
        : null

    // 4. Estimate Accuracy: actual_min / estimate_min 비율 (1.0 = 정확)
    const accuracyValues = completed
        .filter(i => i.actual_min && i.estimate_min && i.estimate_min > 0)
        .map(i => i.actual_min! / i.estimate_min!)
    const estimateAccuracy = accuracyValues.length > 0
        ? Math.round((accuracyValues.reduce((a: number, b: number) => a + b, 0) / accuracyValues.length) * 100) / 100
        : null

    // 5. WIP: 현재 active 상태 건수
    const wipCount = allItems.filter(i => i.status === 'active' && !i.deleted_at).length

    // 6. Aging WIP: active 상태에서 3일 이상 체류
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const agingWipCount = allItems.filter(i =>
        i.status === 'active' &&
        !i.deleted_at &&
        i.started_at &&
        i.started_at < threeDaysAgo
    ).length

    // 7. Blocked Count: 기간 내 blocked 상태인 건수
    const blockedCount = allItems.filter(i => i.status === 'blocked' && !i.deleted_at).length

    // 8. Created Count: 기간 내 생성된 건수
    const createdCount = allItems.filter(i =>
        i.created_at >= periodStart &&
        i.created_at < periodEnd
    ).length

    // 9. Deleted Count: 기간 내 삭제된 건수
    const deletedCount = allItems.filter(i =>
        i.deleted_at &&
        i.deleted_at >= periodStart &&
        i.deleted_at < periodEnd
    ).length

    // Reopen Count: event_logs에서 work_item_status_changed (to: active, from: done) 조회
    const { data: reopenEvents } = await supabase
        .from('event_logs')
        .select('id')
        .eq('event_type', 'work_item_status_changed')
        .gte('triggered_at', periodStart)
        .lt('triggered_at', periodEnd)
    // reopenEvents에서 payload.from === 'done' && payload.to === 'active' 필터는
    // JSONB 쿼리가 복잡하므로 전체 건수로 근사 (추후 정밀화)
    const reopenCount = reopenEvents?.length ?? 0

    // Top Source
    const sourceCounts: Record<string, number> = {}
    allItems
        .filter((i): i is WorkItemRow & { source_app: string } => !!(i.created_at >= periodStart && i.created_at < periodEnd && i.source_app))
        .forEach(i => {
            sourceCounts[i.source_app] = (sourceCounts[i.source_app] ?? 0) + 1
        })
    const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // AI Model Distribution (from next_action field since it contains model info)
    const modelDist: Record<string, number> = {}
    completed.forEach(i => {
        if (i.next_action) {
            const match = i.next_action.match(/\[.*?\]\s*(.+)/)
            if (match) {
                const model = match[1].trim()
                modelDist[model] = (modelDist[model] ?? 0) + 1
            }
        }
    })

    return {
        throughput,
        avgCycleTimeMin,
        avgLeadTimeMin,
        estimateAccuracy,
        wipCount,
        agingWipCount,
        blockedCount,
        createdCount,
        deletedCount,
        reopenCount,
        topSource,
        aiModelDistribution: modelDist,
    }
}

// === DB에 스냅샷 저장 ===

export async function saveMetricSnapshot(
    periodType: 'daily' | 'weekly',
    periodStart: string,
    metrics: MetricSnapshot,
    projectId?: string | null,
): Promise<void> {
    const userId = await requireUserId()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('metric_snapshots')
        .upsert({
            user_id: userId,
            project_id: projectId ?? null,
            period_type: periodType,
            period_start: periodStart,
            throughput: metrics.throughput,
            avg_cycle_time_min: metrics.avgCycleTimeMin,
            avg_lead_time_min: metrics.avgLeadTimeMin,
            estimate_accuracy: metrics.estimateAccuracy,
            wip_count: metrics.wipCount,
            aging_wip_count: metrics.agingWipCount,
            blocked_count: metrics.blockedCount,
            created_count: metrics.createdCount,
            deleted_count: metrics.deletedCount,
            reopen_count: metrics.reopenCount,
            top_source: metrics.topSource,
            ai_model_distribution: metrics.aiModelDistribution,
        }, {
            onConflict: 'user_id,project_id,period_type,period_start',
        })

    if (error) throw error
}

// === 저장된 스냅샷 조회 ===

export async function getMetricSnapshots(
    periodType: 'daily' | 'weekly',
    limit: number = 30,
    projectId?: string | null,
): Promise<MetricSnapshotRow[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
        .from('metric_snapshots')
        .select('*')
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(limit)

    if (projectId) {
        query = query.eq('project_id', projectId)
    } else {
        query = query.is('project_id', null)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as MetricSnapshotRow[]
}
