// ============================================
// taskDecomposer.ts — Plan → AgentTask 분해기
// TaskType + 최신 AI 모델 기반 작업 분해
// ============================================

import type { AIModel } from '../../types/index'
import type { TaskType } from './taskTypes'
import { getDefaultModel } from './taskTypes'

// === 입력/출력 타입 ===

export interface DecompositionInput {
    plan_title: string
    plan_description: string
    plan_type: 'task' | 'event' | 'fixed' | 'project'
    labels: string[]
}

export interface DecomposedTask {
    instruction: string
    suggested_model: AIModel
    task_type: TaskType
    category: string
    labels: string[]
    complexity: 'low' | 'medium' | 'high'
    order: number
    dependencies: number[]
}

export interface DecompositionResult {
    tasks: DecomposedTask[]
    total_estimated_min: number
    strategy: string
}

// === 키워드 기반 작업 패턴 ===

interface TaskPattern {
    keywords: string[]
    taskType: TaskType
    complexity: 'low' | 'medium' | 'high'
    template: string
}

const TASK_PATTERNS: TaskPattern[] = [
    {
        keywords: ['로그인', '인증', 'auth', 'login', 'signup', 'oauth', '보안'],
        taskType: 'security',
        complexity: 'high',
        template: '인증/보안 시스템 구현',
    },
    {
        keywords: ['api', '엔드포인트', 'crud', 'endpoint', 'route', '서버'],
        taskType: 'api_dev',
        complexity: 'medium',
        template: 'API 엔드포인트 구현',
    },
    {
        keywords: ['ui', '컴포넌트', 'component', '화면', 'page', '뷰', 'view', '페이지'],
        taskType: 'code_write',
        complexity: 'medium',
        template: 'UI/페이지 구현',
    },
    {
        keywords: ['리팩토링', 'refactor', '정리', 'cleanup', '구조', 'architect'],
        taskType: 'refactor',
        complexity: 'high',
        template: '코드 리팩토링',
    },
    {
        keywords: ['테스트', 'test', 'e2e', 'unit', 'vitest', 'jest'],
        taskType: 'testing',
        complexity: 'medium',
        template: '테스트 작성',
    },
    {
        keywords: ['배포', 'deploy', 'ci', 'cd', 'build', 'vercel'],
        taskType: 'deploy',
        complexity: 'medium',
        template: 'CI/CD 설정',
    },
    {
        keywords: ['문서', 'docs', 'readme', '조사', 'research', '분석'],
        taskType: 'research_docs',
        complexity: 'low',
        template: '조사/문서 작성',
    },
    {
        keywords: ['db', 'database', '마이그레이션', 'migration', 'schema', 'supabase'],
        taskType: 'db_migration',
        complexity: 'high',
        template: 'DB 마이그레이션',
    },
    {
        keywords: ['버그', 'bug', 'fix', 'error', '디버깅', 'debug'],
        taskType: 'debug',
        complexity: 'medium',
        template: '버그 수정',
    },
    {
        keywords: ['디자인', 'design', 'token', 'theme', '스타일', 'tailwind'],
        taskType: 'design',
        complexity: 'medium',
        template: '디자인 시스템 구현',
    },
]

// === 분해 로직 ===

export function decomposePlan(input: DecompositionInput): DecompositionResult {
    const text = `${input.plan_title} ${input.plan_description}`.toLowerCase()
    const matchedPatterns = findMatchingPatterns(text, input.labels)

    if (matchedPatterns.length === 0) {
        return {
            tasks: [{
                instruction: input.plan_title,
                suggested_model: 'claude_sonnet_4_6',
                task_type: 'code_write',
                category: 'code_write',
                labels: input.labels,
                complexity: 'medium',
                order: 1,
                dependencies: [],
            }],
            total_estimated_min: 30,
            strategy: '단일 작업 (자동 분해 불가)',
        }
    }

    const tasks: DecomposedTask[] = matchedPatterns.map((pattern, idx) => ({
        instruction: `${pattern.template}: ${input.plan_title}`,
        suggested_model: getDefaultModel(pattern.taskType),
        task_type: pattern.taskType,
        category: pattern.taskType,
        labels: [...input.labels, pattern.taskType],
        complexity: pattern.complexity,
        order: idx + 1,
        dependencies: idx > 0 ? [idx] : [],
    }))

    // 테스트 항상 마지막
    if (!matchedPatterns.some(p => p.taskType === 'testing')) {
        tasks.push({
            instruction: `테스트 작성: ${input.plan_title}`,
            suggested_model: getDefaultModel('testing'),
            task_type: 'testing',
            category: 'testing',
            labels: [...input.labels, 'testing'],
            complexity: 'medium',
            order: tasks.length + 1,
            dependencies: tasks.map(t => t.order),
        })
    }

    const complexityMinutes: Record<string, number> = {
        low: 15, medium: 30, high: 60,
    }
    const totalMin = tasks.reduce(
        (sum, t) => sum + (complexityMinutes[t.complexity] ?? 30), 0
    )

    return {
        tasks,
        total_estimated_min: totalMin,
        strategy: tasks.length > 2
            ? `${tasks.length}단계 분해 (${tasks.map(t => t.task_type).join(' → ')})`
            : `${tasks.length}단계 실행`,
    }
}

// === 패턴 매칭 ===

function findMatchingPatterns(text: string, labels: string[]): TaskPattern[] {
    const matched: TaskPattern[] = []
    const usedTypes = new Set<TaskType>()

    for (const pattern of TASK_PATTERNS) {
        const hasKeyword = pattern.keywords.some(kw => text.includes(kw))
        const hasLabel = labels.some(l => pattern.keywords.includes(l.toLowerCase()))

        if ((hasKeyword || hasLabel) && !usedTypes.has(pattern.taskType)) {
            matched.push(pattern)
            usedTypes.add(pattern.taskType)
        }
    }

    return matched
}
