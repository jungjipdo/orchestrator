// ============================================
// gemini.ts — Gemini API 클라이언트
// 작업 분석 + 분해 (프로젝트 컨텍스트 + 모델 점수 반영)
// ============================================

import type { AIModel } from '../types/index'
import type { TaskType } from '../features/orchestration/taskTypes'

// === 타입 ===

export interface GeminiTaskResult {
    instruction: string
    task_type: TaskType
    suggested_model: AIModel
    complexity: 'low' | 'medium' | 'high'
    estimate_min: number
    reference?: string   // 참조 소스 (커밋 sha 또는 "README")
}

export interface ProjectContext {
    repoName: string
    language: string | null
    readme: string | null
    recentCommits: string[]
    recentChangedFiles?: string[]  // 최근 변경된 파일 목록
    openIssues?: { number: number; title: string; body: string }[] // 열린 이슈 목록
    fetchedAt?: number             // 컨텍스트 수집 시점 (timestamp)
}

export interface ModelScoreInput {
    model_key: AIModel
    coding: number
    analysis: number
    documentation: number
    speed: number
}

// === Gemini API ===

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

function buildSystemPrompt(
    availableModels: AIModel[],
    context?: ProjectContext,
    modelScores?: ModelScoreInput[],
): string {
    const modelList = availableModels.join(', ')

    // ─── 프로젝트 컨텍스트 블록 ───
    let contextBlock = ''
    if (context) {
        const commitList = context.recentCommits.length > 0
            ? context.recentCommits.map((c, i) => `  ${i + 1}. ${c}`).join('\n')
            : '  (no recent commits)'

        const changedFiles = context.recentChangedFiles && context.recentChangedFiles.length > 0
            ? `- Recently changed files:\n${context.recentChangedFiles.slice(0, 20).map(f => `  - ${f}`).join('\n')}`
            : ''

        // freshness 체크
        const freshnessNote = context.fetchedAt
            ? (() => {
                const ageMin = Math.round((Date.now() - context.fetchedAt) / 60000)
                if (ageMin > 1440) return '\n⚠️ Context is over 24h old — recommend lower confidence.'
                return ''
            })()
            : ''

        contextBlock = `
PROJECT CONTEXT:
- Repository: ${context.repoName}
- Language: ${context.language ?? 'Unknown'}
${context.readme ? `- README (excerpt):\n${context.readme.slice(0, 2000)}` : '- README: not available'}
- Recent commits:
${commitList}
${changedFiles}
${context.openIssues && context.openIssues.length > 0
                ? `- Open Issues (Use as secondary reference if relevant):\n${context.openIssues.map(i => `  - #${i.number} ${i.title}`).join('\n')}`
                : '- Open Issues: none'
            }${freshnessNote}

Use this context strictly to understand the environment, but prioritize the user's explicit instruction.
`
    }

    // ─── 모델 점수 블록 ───
    let scoreBlock = ''
    if (modelScores && modelScores.length > 0) {
        const scoreLines = modelScores
            .filter(s => availableModels.includes(s.model_key))
            .map(s => `  ${s.model_key}: coding=${s.coding} analysis=${s.analysis} docs=${s.documentation} speed=${s.speed}`)
            .join('\n')
        if (scoreLines) {
            scoreBlock = `
MODEL PERFORMANCE SCORES (0-100, higher = better):
${scoreLines}

Prefer models with higher scores for the relevant category.
For code_write/refactor/debug tasks, prioritize "coding" score.
For research_docs tasks, prioritize "documentation" score.
For testing/security tasks, prioritize "analysis" score.
`
        }
    }

    return `You are an elite software development task orchestration expert.
Analyze the user's task description and break it down into SPECIFIC, HIGH-VALUE sub-tasks.
${contextBlock}${scoreBlock}

CRITICAL RULES FOR TASK GENERATION:
1. INTENT COMES FIRST: Read the user's instruction carefully. If they ask for a Proof of Concept (PoC) or exploit analysis, output EXACT steps for that workflow (e.g., compile contract, write exploit script, run tests). DO NOT output generic tasks.
2. NO BOILERPLATE: NEVER suggest meaningless maintenance tasks like "Update README", "Update CI/CD scripts", "Add base interfaces", or "Formatting" UNLESS specifically requested by the user.
3. CONTEXT IS SECONDARY: Use GitHub Commits and Issues as background knowledge (e.g., naming conventions, architecture) or optional targets, but DO NOT let them override the user's explicit prompt.
4. SPECIFICITY: Avoid vague verbs like "Improve", "Optimize", or "Refactor" without stating EXACTLY what component or logic is being changed.
5. FORMAT: Return 2-5 tasks maximum.
6. LANGUAGE: All instruction text must be in Korean (be concise, max 1 sentence).
7. MODELS: ONLY use models from this available list: ${modelList}

Return a JSON array. Each item has:
- instruction: Specific task description in Korean (be concise, max 1 sentence)
- task_type: One of: code_write, refactor, testing, debug, api_dev, db_migration, security, deploy, design, research_docs
- suggested_model: MUST be one of: ${modelList}
- complexity: low, medium, or high
- estimate_min: Estimated minutes (number, be realistic)
- reference: What context informed this task (e.g. "User Prompt", "issue #12", "commit:abc1234")

Task type definitions:
- code_write: New feature/module implementation
- refactor: Code structure improvement
- testing: Writing tests
- debug: Bug analysis and fixes
- api_dev: API endpoints/server logic
- db_migration: Schema changes
- security: Auth/security or Exploit/PoC creation
- deploy: CI/CD pipeline
- design: UI components/design system
- research_docs: Research + documentation

IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation.`
}

export async function analyzeTaskWithGemini(
    description: string,
    availableModels?: AIModel[],
    context?: ProjectContext,
    modelScores?: ModelScoreInput[],
): Promise<GeminiTaskResult[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다. .env.local에 추가해주세요.')
    }

    const models = availableModels && availableModels.length > 0
        ? availableModels
        : ['claude_sonnet_4_6' as AIModel]

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: {
                parts: [{ text: buildSystemPrompt(models, context, modelScores) }],
            },
            contents: [{
                parts: [{ text: description }],
            }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        }),
    })

    if (!response.ok) {
        const err = await response.text()
        throw new Error(`Gemini API 오류 (${response.status}): ${err}`)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
        throw new Error('Gemini 응답이 비어있습니다.')
    }

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const tasks: GeminiTaskResult[] = JSON.parse(cleaned)

    if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('Gemini 응답 형식이 올바르지 않습니다.')
    }

    return tasks.map(t => ({
        ...t,
        suggested_model: models.includes(t.suggested_model) ? t.suggested_model : models[0],
    }))
}
