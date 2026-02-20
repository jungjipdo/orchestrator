// ============================================
// useMetrics — 운영 지표 집계 훅
// 자동 일일 집계 + 실시간 조회
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react'
import {
    computeMetrics,
    saveMetricSnapshot,
    getMetricSnapshots,
    type MetricSnapshot,
    type MetricSnapshotRow,
} from '../lib/metrics/computeMetrics'

interface UseMetricsReturn {
    /** 현재 실시간 계산된 지표 (오늘) */
    current: MetricSnapshot | null
    /** 저장된 일간 스냅샷 히스토리 */
    dailyHistory: MetricSnapshotRow[]
    /** 저장된 주간 스냅샷 히스토리 */
    weeklyHistory: MetricSnapshotRow[]
    /** 로딩 상태 */
    loading: boolean
    /** 에러 메시지 */
    error: string | null
    /** 수동 새로고침 */
    refresh: () => Promise<void>
    /** 수동 일간 집계 트리거 */
    triggerDailySnapshot: () => Promise<void>
}

const LAST_SNAPSHOT_KEY = 'orchestrator_last_snapshot_date'

export function useMetrics(projectId?: string | null): UseMetricsReturn {
    const [current, setCurrent] = useState<MetricSnapshot | null>(null)
    const [dailyHistory, setDailyHistory] = useState<MetricSnapshotRow[]>([])
    const [weeklyHistory, setWeeklyHistory] = useState<MetricSnapshotRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const autoSnapshotDone = useRef(false)

    // 오늘 날짜 기준
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10) // YYYY-MM-DD
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10)

    // 실시간 지표 계산 + 히스토리 조회
    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            // 1. 실시간 계산 (오늘 기준)
            const metrics = await computeMetrics(todayStr, tomorrowStr, projectId)
            setCurrent(metrics)

            // 2. 히스토리 조회
            const [daily, weekly] = await Promise.all([
                getMetricSnapshots('daily', 30, projectId),
                getMetricSnapshots('weekly', 12, projectId),
            ])
            setDailyHistory(daily)
            setWeeklyHistory(weekly)
        } catch (err) {
            setError(err instanceof Error ? err.message : '지표 계산 실패')
        } finally {
            setLoading(false)
        }
    }, [todayStr, tomorrowStr, projectId])

    // 일간 스냅샷 자동 트리거 (하루에 한 번)
    useEffect(() => {
        if (autoSnapshotDone.current) return
        autoSnapshotDone.current = true

        const lastDate = localStorage.getItem(LAST_SNAPSHOT_KEY)
        if (lastDate === todayStr) return // 이미 오늘 집계함

        // 어제 데이터 집계
        const yesterday = new Date(today.getTime() - 86400000)
        const yesterdayStr = yesterday.toISOString().slice(0, 10)

        void (async () => {
            try {
                const metrics = await computeMetrics(yesterdayStr, todayStr, projectId)
                await saveMetricSnapshot('daily', yesterdayStr, metrics, projectId)
                localStorage.setItem(LAST_SNAPSHOT_KEY, todayStr)
            } catch {
                // 자동 집계 실패는 무시 (다음 접속 시 재시도)
            }
        })()
    }, [todayStr, today, projectId])

    // 수동 일간 집계
    const triggerDailySnapshot = useCallback(async () => {
        try {
            const metrics = await computeMetrics(todayStr, tomorrowStr, projectId)
            await saveMetricSnapshot('daily', todayStr, metrics, projectId)
            await refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : '집계 실패')
        }
    }, [todayStr, tomorrowStr, projectId, refresh])

    // 초기 로드
    useEffect(() => {
        void refresh()
    }, [refresh])

    return {
        current,
        dailyHistory,
        weeklyHistory,
        loading,
        error,
        refresh,
        triggerDailySnapshot,
    }
}
