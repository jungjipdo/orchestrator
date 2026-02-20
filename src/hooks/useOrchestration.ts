// ============================================
// useOrchestration.ts — React Hook
// 에디터 토글 + AI 모델 추천 + 작업 관리
// ============================================

import { useState, useEffect, useCallback } from 'react'
import type { AgentConnectionRow } from '../types/database'
import type { ModelRecommendation, TaskContext } from '../features/orchestration/advisor'
import type { RiskResult } from '../features/orchestration/riskAnalyzer'
import type { DecompositionResult, DecompositionInput } from '../features/orchestration/taskDecomposer'
import {
    getAgentConnections,
    toggleEditor,
    getModelStats,
} from '../lib/supabase/agentConnections'
import { recommendModel } from '../features/orchestration/advisor'
import { analyzeRisk } from '../features/orchestration/riskAnalyzer'
import { decomposePlan } from '../features/orchestration/taskDecomposer'
import type { EditorType, AIModel } from '../types/index'

export function useOrchestration() {
    const [connections, setConnections] = useState<AgentConnectionRow[]>([])
    const [stats, setStats] = useState<{
        model: string
        total_tasks: number
        completed: number
        failed: number
    }[]>([])
    const [loading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // === 데이터 로드 ===

    const refresh = useCallback(async () => {
        setError(null)
        try {
            const [conns, sts] = await Promise.all([
                getAgentConnections().catch(() => []),
                getModelStats().catch(() => []),
            ])
            setConnections(conns)
            setStats(sts)
        } catch {
            // 테이블 미존재 등 — 무시하고 빈 상태로 시작
        }
    }, [])

    useEffect(() => { refresh() }, [refresh])

    // === 에디터 토글 (optimistic & local persistence) ===

    const [localEditors, setLocalEditors] = useState<EditorType[]>(() => {
        try {
            const stored = localStorage.getItem('orchestrator_editors')
            if (stored) return JSON.parse(stored) as EditorType[]
        } catch { }
        return []
    })
    const [syncedFromDb, setSyncedFromDb] = useState(false)

    // DB에서 로드된 후 로컬 상태와 병합
    useEffect(() => {
        if (!loading && !syncedFromDb && connections.length > 0) {
            setLocalEditors(prev => {
                const dbEditors = connections.map(c => c.editor_type as EditorType)
                const merged = Array.from(new Set([...prev, ...dbEditors]))
                localStorage.setItem('orchestrator_editors', JSON.stringify(merged))
                return merged
            })
            setSyncedFromDb(true)
        } else if (!loading && !syncedFromDb) {
            setSyncedFromDb(true)
        }
    }, [connections, loading, syncedFromDb])

    const toggle = useCallback((editorType: EditorType) => {
        // 즉시 로컬 상태 업데이트 + localStorage 저장
        setLocalEditors(prev => {
            const next = prev.includes(editorType)
                ? prev.filter(e => e !== editorType)
                : [...prev, editorType]
            localStorage.setItem('orchestrator_editors', JSON.stringify(next))
            return next
        })
        // 백그라운드 Supabase 동기화 (에러 무시)
        toggleEditor(editorType).catch(() => { /* DB 미적용 시 무시 */ })
    }, [])

    // === 등록된 에디터 목록 (로컬 우선) ===

    const registeredEditors = syncedFromDb ? localEditors : connections.map(c => c.editor_type as EditorType)

    // === AI 기능 ===

    const getRecommendation = useCallback((task: TaskContext): ModelRecommendation[] => {
        return recommendModel(task, stats.map(s => ({
            model: s.model as AIModel,
            total_tasks: s.total_tasks,
            completed: s.completed,
            failed: s.failed,
            avg_duration_ms: null,
        })))
    }, [stats])

    const getRisk = useCallback((
        model: AIModel,
        category: string,
        complexity: 'low' | 'medium' | 'high',
        labels: string[],
    ): RiskResult => {
        return analyzeRisk(
            { model, category, complexity, labels },
            stats.map(s => ({
                model: s.model as AIModel,
                category,
                total: s.total_tasks,
                failed: s.failed,
                avg_duration_ms: null,
            })),
        )
    }, [stats])

    const decompose = useCallback((input: DecompositionInput): DecompositionResult => {
        return decomposePlan(input)
    }, [])

    return {
        // 데이터
        connections,
        registeredEditors,
        stats,
        loading,
        error,
        // 액션
        refresh,
        toggle,
        // AI
        getRecommendation,
        getRisk,
        decompose,
    }
}
