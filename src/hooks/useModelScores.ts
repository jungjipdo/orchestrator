// ============================================
// useModelScores — 모델 성능평가 점수 관리 훅
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { getModelScores, upsertModelScore, type ModelScore } from '../lib/supabase/modelScores'
import type { AIModel } from '../types/index'

/** Tauri 환경인지 체크 */
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

// 모든 모델의 기본 점수 (사용자 제공 지표 업데이트)
const DEFAULT_SCORES: Record<AIModel, { coding: number; analysis: number; documentation: number; speed: number }> = {
    // Anthropic
    claude_opus_4_6: { coding: 93, analysis: 90, documentation: 92, speed: 42 },
    claude_sonnet_4_6: { coding: 88, analysis: 84, documentation: 91, speed: 64 },
    // OpenAI
    gpt_5_3_codex: { coding: 96, analysis: 84, documentation: 82, speed: 82 },
    gpt_5_3_codex_spark: { coding: 84, analysis: 76, documentation: 72, speed: 100 },
    gpt_5_2_codex: { coding: 90, analysis: 80, documentation: 78, speed: 70 },
    // Cursor
    cursor_composer: { coding: 82, analysis: 78, documentation: 76, speed: 95 },
    // Google
    gemini_3_1_pro: { coding: 92, analysis: 96, documentation: 87, speed: 56 },
    gemini_3_pro: { coding: 83, analysis: 86, documentation: 84, speed: 58 },
    gemini_3_flash: { coding: 80, analysis: 82, documentation: 85, speed: 94 },
    gemini_3_deep_think: { coding: 89, analysis: 100, documentation: 80, speed: 20 },
    // xAI
    grok_code: { coding: 88, analysis: 88, documentation: 80, speed: 92 },
    // Moonshot
    kimi_2_5: { coding: 87, analysis: 85, documentation: 95, speed: 81 },
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
            if (isTauri()) {
                const { invoke } = await import('@tauri-apps/api/core')
                const data = await invoke<ModelScore[]>('db_get_model_scores')
                setDbScores(Array.isArray(data) ? data : [])
            } else {
                const data = await getModelScores()
                setDbScores(data)
            }
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
            if (isTauri()) {
                const { invoke } = await import('@tauri-apps/api/core')
                await invoke('db_upsert_model_score', {
                    modelKey,
                    coding: scoreValues.coding,
                    analysis: scoreValues.analysis,
                    documentation: scoreValues.documentation,
                    speed: scoreValues.speed,
                })
            } else {
                await upsertModelScore(modelKey, scoreValues)
            }
            await fetchScores()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update score')
        }
    }, [fetchScores])

    return { scores, loading, error, updateScore }
}

export { DEFAULT_SCORES }
