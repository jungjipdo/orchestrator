// ============================================
// useEditorModels — 에디터-모델 매핑 관리 훅
// ============================================

import { useCallback } from 'react'
import type { EditorType, AIModel } from '../types/index'

// 하드코딩 기본값 (고정)
const FIXED_EDITOR_MODELS: Record<EditorType, AIModel[]> = {
    cursor: ['claude_sonnet_4_6', 'claude_opus_4_6', 'gpt_5_3_codex', 'gpt_5_2_codex', 'gemini_3_pro', 'gemini_3_flash', 'cursor_composer'],
    claude_code: ['claude_sonnet_4_6', 'claude_opus_4_6', 'claude_haiku_4_5'],
    codex: ['gpt_5_3_codex', 'gpt_5_3_codex_spark'],
    antigravity: ['gemini_3_1_pro', 'gemini_3_pro', 'gemini_3_flash', 'gemini_3_deep_think', 'gemini_2_5_pro'],
}

export interface EditorModelEntry {
    editorType: EditorType
    supportedModels: AIModel[]
}

interface UseEditorModelsReturn {
    editorModels: EditorModelEntry[]
    getModelsForEditor: (editorType: EditorType) => AIModel[]
}

export function useEditorModels(): UseEditorModelsReturn {
    // DB 값 무시하고 전부 고정 세팅 반환
    const editorModels: EditorModelEntry[] = (Object.keys(FIXED_EDITOR_MODELS) as EditorType[]).map(editorType => {
        return {
            editorType,
            supportedModels: FIXED_EDITOR_MODELS[editorType],
        }
    })

    const getModelsForEditor = useCallback((editorType: EditorType): AIModel[] => {
        return FIXED_EDITOR_MODELS[editorType] ?? []
    }, [])

    return { editorModels, getModelsForEditor }
}
