// ============================================
// reviewAnalysis.ts — AI Review 구조화 분석
// snapshot 수집 → Gemini 호출 → ReviewResult 반환
// ============================================

import type { ReviewSnapshot, ReviewResult } from '../../types/review'
import type { PlanRow } from '../../types/database'
import type { EventLog } from '../../types/index'

// === Snapshot 수집 ===

interface SnapshotInput {
    plans: PlanRow[]
    workItems: { status: string; started_at: string | null; completed_at: string | null }[]
    eventLogs: EventLog[]
    agentCount: number
}

interface SubTaskData {
    done: boolean
}

interface DetailPlanData {
    sub_tasks?: SubTaskData[]
}

export function buildSnapshot(input: SnapshotInput): ReviewSnapshot {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Plans 분석
    const plansByStatus: Record<string, number> = {}
    const stalePlans: ReviewSnapshot['plans']['stale_plans'] = []

    for (const plan of input.plans) {
        plansByStatus[plan.status] = (plansByStatus[plan.status] ?? 0) + 1

        if (plan.status === 'active') {
            const activeDays = Math.floor(
                (now.getTime() - new Date(plan.updated_at).getTime()) / (1000 * 60 * 60 * 24)
            )
            if (activeDays >= 3) {
                const meta = plan.metadata as Record<string, unknown> | undefined
                const dp = meta?.detail_plan as DetailPlanData | undefined
                const subTasks = dp?.sub_tasks ?? []
                const doneCount = subTasks.filter(t => t.done).length
                stalePlans.push({
                    id: plan.id,
                    title: plan.title,
                    days_active: activeDays,
                    sub_task_progress: `${doneCount}/${subTasks.length}`,
                })
            }
        }
    }

    // Work Items 분석
    const wiByStatus: Record<string, number> = {}
    let blocked = 0
    const completionHours: number[] = []
    let completed7d = 0

    for (const wi of input.workItems) {
        wiByStatus[wi.status] = (wiByStatus[wi.status] ?? 0) + 1
        if (wi.status === 'blocked') blocked++
        if (wi.status === 'done' && wi.completed_at && wi.started_at) {
            const hours = (new Date(wi.completed_at).getTime() - new Date(wi.started_at).getTime()) / (1000 * 60 * 60)
            if (hours > 0 && hours < 720) completionHours.push(hours) // 30일 이내만
            if (new Date(wi.completed_at) >= sevenDaysAgo) completed7d++
        }
    }

    const avgHours = completionHours.length > 0
        ? Math.round((completionHours.reduce((a, b) => a + b, 0) / completionHours.length) * 10) / 10
        : null

    // Activity 분석
    const recent7d = input.eventLogs.filter(e => new Date(e.triggered_at) >= sevenDaysAgo)
    const byActor: Record<string, number> = {}
    const byDay: Record<string, number> = {}

    for (const e of recent7d) {
        byActor[e.actor] = (byActor[e.actor] ?? 0) + 1
        const day = e.triggered_at.slice(0, 10)
        byDay[day] = (byDay[day] ?? 0) + 1
    }

    const mostActiveDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return {
        plans: {
            total: input.plans.length,
            by_status: plansByStatus,
            stale_plans: stalePlans,
        },
        work_items: {
            total: input.workItems.length,
            by_status: wiByStatus,
            blocked_count: blocked,
            avg_completion_hours: avgHours,
            completed_last_7_days: completed7d,
        },
        activity: {
            total_events_7d: recent7d.length,
            by_actor: byActor,
            most_active_day: mostActiveDay,
        },
        agents: {
            registered_count: input.agentCount,
            active_count: input.agentCount, // 간소화: 등록 = 활성
        },
        generated_at: now.toISOString(),
    }
}

// === Gemini 호출 ===

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const REVIEW_SYSTEM_PROMPT = `You are a project health analyst for an AI agent orchestration platform.
You will receive a JSON snapshot of the project's current state.

Analyze the data and return a structured JSON review.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "health_score": <0-100>,
  "health_label": "critical" | "warning" | "healthy" | "excellent",
  "stale_alerts": [{ "plan_id": "<id>", "title": "<title>", "stale_days": <n>, "suggestion": "<한국어 한 줄 제안>" }],
  "velocity": { "avg_completion_hours": <n>, "trend": "improving" | "stable" | "declining", "summary": "<한국어 한 줄 요약>" },
  "risk_items": [{ "area": "<영역>", "level": "low" | "medium" | "high", "reason": "<한국어>" }],
  "next_actions": ["<한국어 행동 1>", "<한국어 행동 2>", "<한국어 행동 3>"]
}

RULES:
1. health_score: 80+ = excellent, 60-79 = healthy, 40-59 = warning, 0-39 = critical
2. stale_alerts: Only include plans from the stale_plans list in the snapshot
3. velocity.trend: Compare avg_completion_hours with a reasonable baseline (4h = fast, 8h = normal, 16h+ = slow)
4. risk_items: Max 3 items. Focus on blocked work items, stale plans, low activity
5. next_actions: Max 3 items. Concrete, actionable, written in Korean
6. All Korean text should be concise (max 1 sentence)
7. Return ONLY valid JSON. No markdown wrapping.`

export async function runAIReview(snapshot: ReviewSnapshot): Promise<ReviewResult> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY

    if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.')
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: {
                parts: [{ text: REVIEW_SYSTEM_PROMPT }],
            },
            contents: [{
                parts: [{ text: JSON.stringify(snapshot, null, 2) }],
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
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
    if (!text) throw new Error('Gemini 응답이 비어있습니다.')

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as ReviewResult
}
