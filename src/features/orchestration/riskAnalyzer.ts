// ============================================
// riskAnalyzer.ts — 리스크 분석 엔진 (규칙 기반)
// AI 모델 + 작업 특성 기반 리스크 평가
// 2026.02.19 최신 모델 기준
// ============================================

import type { AIModel } from '../../types/index'

// === 타입 ===

export interface RiskInput {
    model: AIModel
    category: string
    complexity: 'low' | 'medium' | 'high'
    labels: string[]
}

export interface HistoricalData {
    model: AIModel
    category: string
    total: number
    failed: number
    avg_duration_ms: number | null
}

export interface RiskFactor {
    description: string
    impact: number
}

export interface RiskResult {
    score: number
    level: 'low' | 'medium' | 'high' | 'critical'
    factors: RiskFactor[]
    recommendation: string
}

// === 리스크 분석 ===

export function analyzeRisk(
    input: RiskInput,
    history: HistoricalData[],
): RiskResult {
    const factors: RiskFactor[] = []
    const baseScore = 30

    // 1. 과거 실패율 분석
    const relevant = history.filter(
        h => h.model === input.model && h.category === input.category
    )

    let historyDelta = 0
    if (relevant.length > 0) {
        const totalFailed = relevant.reduce((s, h) => s + h.failed, 0)
        const totalTasks = relevant.reduce((s, h) => s + h.total, 0)
        const failRate = totalTasks > 0 ? totalFailed / totalTasks : 0

        if (failRate > 0.3) {
            historyDelta = 25
            factors.push({ description: `${input.model} 실패율 ${Math.round(failRate * 100)}% (${input.category})`, impact: 25 })
        } else if (failRate > 0.1) {
            historyDelta = 10
            factors.push({ description: `${input.model} 실패율 ${Math.round(failRate * 100)}%`, impact: 10 })
        } else {
            historyDelta = -10
            factors.push({ description: `${input.model} 안정적 이력`, impact: -10 })
        }
    } else {
        historyDelta = 5
        factors.push({ description: `${input.model}으로 ${input.category} 작업 이력 없음`, impact: 5 })
    }

    // 2. 복잡도 보정
    const complexityMap: Record<string, number> = { low: -10, medium: 0, high: 20 }
    const complexityDelta = complexityMap[input.complexity] ?? 0
    if (complexityDelta !== 0) {
        factors.push({ description: `복잡도: ${input.complexity}`, impact: complexityDelta })
    }

    // 3. 위험 라벨
    const riskyLabels = ['migration', 'security', 'database', 'deploy', 'breaking']
    const riskyCount = input.labels.filter(l => riskyLabels.includes(l.toLowerCase())).length
    const labelDelta = riskyCount * 15
    if (riskyCount > 0) {
        factors.push({ description: `위험 라벨 ${riskyCount}개 감지`, impact: labelDelta })
    }

    // 4. 모델 특성 보정 (2026.02 최신)
    const modelRiskMap: Partial<Record<AIModel, number>> = {
        'gpt_5_3_codex_spark': 5,     // 초저지연, 복잡한 작업엔 리스크 약간
        'gemini_3_flash': 3,          // 빠르지만 심층 분석엔 약간 리스크
        'claude_opus_4_6': -5,        // 신중, 리스크 낮음
        'gemini_3_deep_think': -5,    // 깊은 추론
    }
    const modelDelta = modelRiskMap[input.model] ?? 0
    if (modelDelta !== 0) {
        factors.push({ description: `${input.model} 모델 특성`, impact: modelDelta })
    }

    const finalScore = Math.max(0, Math.min(100,
        baseScore + historyDelta + complexityDelta + labelDelta + modelDelta
    ))

    const level: RiskResult['level'] =
        finalScore >= 75 ? 'critical' :
            finalScore >= 50 ? 'high' :
                finalScore >= 30 ? 'medium' : 'low'

    const recommendations: Record<string, string> = {
        critical: '높은 리스크. 수동 검토 + Opus 4.6 권장.',
        high: '리스크 주의. 단계별 검증 추천.',
        medium: '일반 수준. 정상 진행 가능.',
        low: '리스크 낮음. 자동 실행 가능.',
    }

    return {
        score: finalScore,
        level,
        factors,
        recommendation: recommendations[level],
    }
}
