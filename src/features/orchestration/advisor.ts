// ============================================
// advisor.ts — AI 모델 추천 엔진 (규칙 기반)
// TaskType + 이력 기반 최적 AI 모델 추천
// 2026.02.19 최신 모델 기준
// ==============================================

import type { AIModel } from '../../types/index'
import type { TaskType } from './taskTypes'
import { getDefaultModel } from './taskTypes'

// === 입력/출력 타입 ===

export interface TaskContext {
    labels: string[]
    category: string
    taskType?: TaskType
    complexity: 'low' | 'medium' | 'high'
    description: string
}

export interface ModelHistory {
    model: AIModel
    total_tasks: number
    completed: number
    failed: number
    avg_duration_ms: number | null
}

export interface ModelRecommendation {
    model: AIModel
    confidence: number          // 0–100
    reason: string
    risk_level: 'low' | 'medium' | 'high'
}

// === TaskType → 기본 모델 매핑 (taskTypes.ts 위임) ===

const CATEGORY_TYPE_MAP: Record<string, TaskType> = {
    ui: 'code_write',
    style: 'design',
    frontend: 'code_write',
    refactor: 'refactor',
    architect: 'refactor',
    debug: 'debug',
    test: 'testing',
    ci: 'deploy',
    docs: 'research_docs',
    quickfix: 'code_write',
    security: 'security',
    migration: 'db_migration',
    api: 'api_dev',
    design: 'design',
    research: 'research_docs',
}

// === 라벨 → 카테고리 매핑 ===

const LABEL_CATEGORY_MAP: Record<string, string> = {
    'ui': 'ui', 'design': 'design', 'css': 'style', 'styling': 'style',
    'component': 'frontend', 'react': 'frontend', 'page': 'frontend',
    'refactor': 'refactor', 'cleanup': 'refactor', 'migration': 'migration',
    'architecture': 'architect', 'structure': 'architect',
    'bug': 'debug', 'fix': 'debug', 'error': 'debug',
    'test': 'test', 'e2e': 'test', 'unit-test': 'test',
    'ci': 'ci', 'deploy': 'ci', 'build': 'ci',
    'docs': 'docs', 'readme': 'docs', 'documentation': 'docs',
    'security': 'security', 'auth': 'security',
    'api': 'api', 'endpoint': 'api', 'crud': 'api',
}

// === 핵심 추천 로직 ===

export function recommendModel(
    task: TaskContext,
    history: ModelHistory[],
): ModelRecommendation[] {
    const recommendations: ModelRecommendation[] = []

    // 1. TaskType 기반 추천 (명시적 타입이 있으면 그걸 사용)
    const taskType = task.taskType ?? inferTaskType(task)
    const defaultModel = getDefaultModel(taskType)

    const modelHistory = history.find(h => h.model === defaultModel)
    const successRate = modelHistory
        ? (modelHistory.completed / Math.max(modelHistory.total_tasks, 1)) * 100
        : 50

    recommendations.push({
        model: defaultModel,
        confidence: Math.round(Math.min(successRate + 20, 100)),
        reason: `${taskType} 작업에 최적화된 모델`,
        risk_level: successRate < 50 ? 'high' : successRate < 70 ? 'medium' : 'low',
    })

    // 2. 이력 기반 추천 (상위 2개)
    const rankBySuccess = [...history]
        .filter(h => h.total_tasks >= 2 && h.model !== defaultModel)
        .sort((a, b) => {
            const rateA = a.completed / Math.max(a.total_tasks, 1)
            const rateB = b.completed / Math.max(b.total_tasks, 1)
            return rateB - rateA
        })
        .slice(0, 2)

    for (const model of rankBySuccess) {
        const rate = model.completed / Math.max(model.total_tasks, 1)
        recommendations.push({
            model: model.model,
            confidence: Math.round(rate * 80),
            reason: `성공률 ${Math.round(rate * 100)}% (${model.completed}/${model.total_tasks})`,
            risk_level: rate < 0.5 ? 'high' : rate < 0.7 ? 'medium' : 'low',
        })
    }

    // 3. 기본 fall-through
    if (recommendations.length === 0) {
        recommendations.push({
            model: 'claude_sonnet_4_6',
            confidence: 30,
            reason: '기본 추천 (데이터 부족)',
            risk_level: 'medium',
        })
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence)
}

// === TaskType 추론 ===

function inferTaskType(task: TaskContext): TaskType {
    // 라벨에서 추론
    for (const label of task.labels) {
        const category = LABEL_CATEGORY_MAP[label.toLowerCase()]
        if (category && CATEGORY_TYPE_MAP[category]) {
            return CATEGORY_TYPE_MAP[category]
        }
    }

    // 카테고리에서 직접
    if (task.category && CATEGORY_TYPE_MAP[task.category]) {
        return CATEGORY_TYPE_MAP[task.category]
    }

    // 설명 키워드
    const desc = task.description.toLowerCase()
    for (const [kw, cat] of Object.entries(LABEL_CATEGORY_MAP)) {
        if (desc.includes(kw) && CATEGORY_TYPE_MAP[cat]) {
            return CATEGORY_TYPE_MAP[cat]
        }
    }

    return 'code_write' // 기본
}
