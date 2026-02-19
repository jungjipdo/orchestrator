// ============================================
// editorModels.ts — 에디터-모델 매핑 CRUD
// ============================================

import { supabase } from './client'

export interface EditorModelRow {
    id: string
    user_id: string
    editor_type: string
    supported_models: string[]
    updated_at: string
}

export async function getEditorModels(): Promise<EditorModelRow[]> {
    const { data, error } = await supabase
        .from('editor_models')
        .select('*')
        .order('editor_type')

    if (error) throw error
    return (data ?? []) as EditorModelRow[]
}

export async function upsertEditorModels(
    editorType: string,
    supportedModels: string[],
): Promise<EditorModelRow> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    const { data, error } = await supabase
        .from('editor_models')
        .upsert(
            {
                user_id: user.id,
                editor_type: editorType,
                supported_models: supportedModels,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,editor_type' },
        )
        .select()
        .single()

    if (error) throw error
    return data as EditorModelRow
}
