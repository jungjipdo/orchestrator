// ============================================
// modelScores.ts — AI 모델 성능평가 CRUD
// ============================================

import { supabase } from './client'

export interface ModelScore {
    id: string
    user_id: string
    model_key: string
    coding: number
    analysis: number
    documentation: number
    speed: number
    updated_at: string
}

export async function getModelScores(): Promise<ModelScore[]> {
    const { data, error } = await supabase
        .from('model_scores')
        .select('*')
        .order('model_key')

    if (error) throw error
    return (data ?? []) as ModelScore[]
}

export async function upsertModelScore(
    modelKey: string,
    scores: { coding: number; analysis: number; documentation: number; speed: number },
): Promise<ModelScore> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const { data, error } = await supabase
        .from('model_scores')
        .upsert(
            {
                user_id: user.id,
                model_key: modelKey,
                ...scores,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,model_key' },
        )
        .select()
        .single()

    if (error) throw error
    return data as ModelScore
}
