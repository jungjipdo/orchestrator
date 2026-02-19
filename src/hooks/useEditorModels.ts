// ============================================
// useEditorModels — 에디터-모델 매핑 관리 훅
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { getEditorModels, upsertEditorModels, type EditorModelRow } from '../lib/supabase/editorModels'
import type { EditorType, AIModel } from '../types/index'

// 하드코딩 기본값 (DB 데이터 없을 때 fallback)
const DEFAULT_EDITOR_MODELS: Record<EditorType, AIModel[]> = {
    cursor: ['claude_sonnet_4_6', 'claude_opus_4_6', 'gpt_5_3_codex', 'gpt_5_2_codex', 'gemini_3_pro', 'gemini_3_flash', 'cursor_composer'],
    claude_code: ['claude_sonnet_4_6', 'claude_opus_4_6', 'claude_haiku_4_5'],
    codex: ['gpt_5_3_codex', 'gpt_5_3_codex_spark'],
    antigravity: ['gemini_3_pro', 'gemini_3_flash', 'gemini_3_deep_think', 'gemini_2_5_pro'],
    vscode: ['claude_sonnet_4_6', 'claude_opus_4_6', 'gpt_5_3_codex', 'gpt_5_2_codex', 'gemini_3_pro', 'gemini_3_flash'],
    terminal: ['claude_sonnet_4_6', 'claude_opus_4_6', 'claude_haiku_4_5', 'gpt_5_3_codex', 'gpt_5_3_codex_spark', 'gpt_5_2_codex', 'gemini_3_pro', 'gemini_3_flash', 'gemini_3_deep_think'],
    windsurf: ['claude_sonnet_4_6', 'claude_opus_4_6', 'gpt_5_3_codex_spark', 'gpt_5_2_codex'],
    zed: [],
}

export interface EditorModelEntry {
    editorType: EditorType
    supportedModels: AIModel[]
}

interface UseEditorModelsReturn {
    editorModels: EditorModelEntry[]
    loading: boolean
    error: string | null
    updateModels: (editorType: EditorType, models: AIModel[]) => Promise<void>
    getModelsForEditor: (editorType: EditorType) => AIModel[]
}

export function useEditorModels(): UseEditorModelsReturn {
    const [dbRows, setDbRows] = useState<EditorModelRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            const data = await getEditorModels()
            setDbRows(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load editor models')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void fetchData() }, [fetchData])

    // DB 값 + 기본값 합치기
    const editorModels: EditorModelEntry[] = (Object.keys(DEFAULT_EDITOR_MODELS) as EditorType[]).map(editorType => {
        const dbRow = dbRows.find(r => r.editor_type === editorType)
        return {
            editorType,
            supportedModels: dbRow
                ? (dbRow.supported_models as AIModel[])
                : DEFAULT_EDITOR_MODELS[editorType],
        }
    })

    const getModelsForEditor = useCallback((editorType: EditorType): AIModel[] => {
        const dbRow = dbRows.find(r => r.editor_type === editorType)
        return dbRow
            ? (dbRow.supported_models as AIModel[])
            : (DEFAULT_EDITOR_MODELS[editorType] ?? [])
    }, [dbRows])

    const updateModels = useCallback(async (editorType: EditorType, models: AIModel[]) => {
        try {
            await upsertEditorModels(editorType, models)
            await fetchData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update models')
        }
    }, [fetchData])

    return { editorModels, loading, error, updateModels, getModelsForEditor }
}

export { DEFAULT_EDITOR_MODELS }
