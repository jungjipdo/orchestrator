// ============================================
// useAIReview — AI Review 트리거 + 결과 캐싱
// ============================================

import { useState, useCallback } from 'react'
import type { ReviewResult, ReviewSnapshot, CachedReview } from '../types/review'
import type { PlanRow, CliEventRow } from '../types/database'
import type { EventLog } from '../types/index'
import { buildSnapshot, runAIReview } from '../lib/gemini/reviewAnalysis'

const CACHE_KEY = 'orchestrator_ai_review'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30분

interface UseAIReviewInput {
    plans: PlanRow[]
    workItems: { status: string; started_at: string | null; completed_at: string | null }[]
    eventLogs: EventLog[]
    agentCount: number
    cliEvents?: CliEventRow[]  // Phase 2a
}

interface UseAIReviewReturn {
    review: ReviewResult | null
    snapshot: ReviewSnapshot | null
    loading: boolean
    error: string | null
    cachedAt: string | null
    runReview: () => Promise<void>
    clearCache: () => void
}

export function useAIReview(input: UseAIReviewInput): UseAIReviewReturn {
    const [review, setReview] = useState<ReviewResult | null>(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY)
            if (!cached) return null
            const parsed = JSON.parse(cached) as CachedReview
            const age = Date.now() - new Date(parsed.cached_at).getTime()
            if (age < CACHE_TTL_MS) return parsed.result
            return null
        } catch { return null }
    })

    const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY)
            if (!cached) return null
            const parsed = JSON.parse(cached) as CachedReview
            const age = Date.now() - new Date(parsed.cached_at).getTime()
            if (age < CACHE_TTL_MS) return parsed.snapshot
            return null
        } catch { return null }
    })

    const [cachedAt, setCachedAt] = useState<string | null>(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY)
            if (!cached) return null
            const parsed = JSON.parse(cached) as CachedReview
            const age = Date.now() - new Date(parsed.cached_at).getTime()
            if (age < CACHE_TTL_MS) return parsed.cached_at
            return null
        } catch { return null }
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const runReview = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const snap = buildSnapshot(input)
            setSnapshot(snap)
            const result = await runAIReview(snap)
            setReview(result)

            const now = new Date().toISOString()
            setCachedAt(now)
            const cache: CachedReview = { result, snapshot: snap, cached_at: now }
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'AI Review 실패')
        } finally {
            setLoading(false)
        }
    }, [input])

    const clearCache = useCallback(() => {
        localStorage.removeItem(CACHE_KEY)
        setReview(null)
        setSnapshot(null)
        setCachedAt(null)
    }, [])

    return { review, snapshot, loading, error, cachedAt, runReview, clearCache }
}
