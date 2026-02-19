// ============================================
// useModelScores — 모델 성능평가 점수 관리 훅
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { getModelScores, upsertModelScore, type ModelScore } from '../lib/supabase/modelScores'
import type { AIModel } from '../types/index'

// 모든 모델의 기본 점수
const DEFAULT_SCORES: Record<AIModel, { coding: number; analysis: number; documentation: number; speed: number }> = {
    claude_opus_4_6: { coding: 95, analysis: 92, documentation: 85, speed: 40 },
    claude_sonnet_4_6: { coding: 88, analysis: 85, documentation: 80, speed: 70 },
    gpt_5_3_codex: { coding: 92, analysis: 88, documentation: 82, speed: 65 },
    gpt_5_3_codex_spark: { coding: 80, analysis: 75, documentation: 70, speed: 90 },
    gemini_3_pro: { coding: 85, analysis: 90, documentation: 85, speed: 60 },
    gemini_3_flash: { coding: 72, analysis: 75, documentation: 75, speed: 95 },
    gemini_3_deep_think: { coding: 90, analysis: 95, documentation: 88, speed: 30 },
}

export interface ModelScoreEntry {
    model_key: AIModel
    coding: number
    analysis: number
    documentation: number
    speed: number
}

interface UseModelScoresReturn {
    scores: ModelScoreEntry[]
    loading: boolean
    error: string | null
    updateScore: (modelKey: AIModel, scores: { coding: number; analysis: number; documentation: number; speed: number }) => Promise<void>
}

export function useModelScores(): UseModelScoresReturn {
    const [dbScores, setDbScores] = useState<ModelScore[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchScores = useCallback(async () => {
        try {
            const data = await getModelScores()
            setDbScores(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load scores')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void fetchScores() }, [fetchScores])

    // DB 값 + 기본값 합치기
    const scores: ModelScoreEntry[] = (Object.keys(DEFAULT_SCORES) as AIModel[]).map(model => {
        const dbRow = dbScores.find(s => s.model_key === model)
        const defaults = DEFAULT_SCORES[model]
        return {
            model_key: model,
            coding: dbRow?.coding ?? defaults.coding,
            analysis: dbRow?.analysis ?? defaults.analysis,
            documentation: dbRow?.documentation ?? defaults.documentation,
            speed: dbRow?.speed ?? defaults.speed,
        }
    })

    const updateScore = useCallback(async (
        modelKey: AIModel,
        scoreValues: { coding: number; analysis: number; documentation: number; speed: number },
    ) => {
        try {
            await upsertModelScore(modelKey, scoreValues)
            await fetchScores()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update score')
        }
    }, [fetchScores])

    return { scores, loading, error, updateScore }
}

export { DEFAULT_SCORES }
