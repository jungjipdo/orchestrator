// ============================================
// Review Types — AI Review 구조화 타입
// ============================================

// === 스냅샷: Gemini에 보낼 정형 데이터 ===

export interface ReviewSnapshot {
    // Plans 요약
    plans: {
        total: number
        by_status: Record<string, number>        // { active: 3, backlog: 5, done: 2 }
        stale_plans: {                            // 3일+ active인 Plan
            id: string
            title: string
            days_active: number
            sub_task_progress: string             // "3/7" 형식
        }[]
    }
    // Work Items 요약
    work_items: {
        total: number
        by_status: Record<string, number>
        blocked_count: number
        avg_completion_hours: number | null       // 완료된 아이템 평균 소요 시간
        completed_last_7_days: number
    }
    // 활동 로그 요약
    activity: {
        total_events_7d: number
        by_actor: Record<string, number>          // { user: 10, ai: 5, system: 3 }
        most_active_day: string | null            // "2026-02-20"
    }
    // 에이전트 요약
    agents: {
        registered_count: number
        active_count: number                      // 최근 24h 활동
    }
    // 메타
    generated_at: string                          // ISO 8601
}

// === 리뷰 결과: Gemini가 반드시 이 형식으로 응답 ===

export interface ReviewResult {
    health_score: number                 // 0-100 프로젝트 건강도
    health_label: 'critical' | 'warning' | 'healthy' | 'excellent'
    stale_alerts: {
        plan_id: string
        title: string
        stale_days: number
        suggestion: string               // 한 줄 제안 (한국어)
    }[]
    velocity: {
        avg_completion_hours: number
        trend: 'improving' | 'stable' | 'declining'
        summary: string                  // 한 줄 요약 (한국어)
    }
    risk_items: {
        area: string
        level: 'low' | 'medium' | 'high'
        reason: string                   // 한국어
    }[]
    next_actions: string[]               // 추천 다음 행동 (최대 3개, 한국어)
}

// === 캐싱 ===

export interface CachedReview {
    result: ReviewResult
    snapshot: ReviewSnapshot
    cached_at: string                    // ISO 8601
}
