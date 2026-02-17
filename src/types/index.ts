// ============================================
// Orchestrator — Core Type Definitions
// project_start.md 4절(상태모델) + 6절(명령) + 11절(스키마) 기반
// ============================================

// === 상태 모델 (4.2절) ===

export type WorkItemStatus =
    | 'backlog'
    | 'candidate'
    | 'active'
    | 'done'
    | 'blocked'
    | 'deferred'

export type SessionResult = 'done' | 'partial' | 'blocked'

export type SyncMode = 'read_only' | 'manual' | 'approved_write'

export type EnergyLevel = 'high' | 'medium' | 'low'

export type Importance = 'critical' | 'high' | 'medium' | 'low'

// === 핵심 엔티티 (11.2절) ===

export interface WorkItem {
    id: string
    project_id: string | null
    title: string
    status: WorkItemStatus
    next_action: string | null
    estimate_min: number | null
    energy: EnergyLevel | null
    due_at: string | null       // ISO 8601
    source_app: string | null
    source_ref: string | null
    created_at: string
    updated_at: string
}

export interface FixedEvent {
    id: string
    title: string
    start_at: string            // ISO 8601
    end_at: string              // ISO 8601
    importance: Importance
    created_at: string
}

export interface ProjectDeadline {
    id: string
    project_id: string
    milestone: string
    deadline_at: string         // ISO 8601
    risk_score: number          // 0–100
    created_at: string
}

export interface SessionLog {
    id: string
    work_item_id: string
    started_at: string          // ISO 8601
    ended_at: string | null     // ISO 8601
    result: SessionResult | null
    done_log: string | null
    created_at: string
}

export interface ExternalApp {
    id: string
    name: string
    role: string
    status: 'active' | 'inactive'
    deep_link_pattern: string | null
    sync_mode: SyncMode
    created_at: string
}

export interface EventLog {
    id: string
    event_type: string
    payload: Record<string, unknown>
    triggered_at: string        // ISO 8601
    applied_at: string | null   // ISO 8601
    actor: 'user' | 'system' | 'ai'
    created_at: string
}

// === 에러 코드 표준 (Contract C3) ===

export type ErrorCode =
    | 'MISSING_NEXT_ACTION'
    | 'MISSING_DONE_LOG'
    | 'INVALID_TRANSITION'
    | 'NO_ACTIVE_SESSION'
    | 'ACTIVE_SESSION_EXISTS'
    | 'SCHEDULE_CONFLICT'
    | 'INVALID_COMMAND_ARGS'

// === 명령 시스템 (6.2절) ===

export type CommandType =
    | 'capture'
    | 'clarify'
    | 'plan'
    | 'focus'
    | 'close'
    | 'review'
    | 'reschedule'

export interface Command {
    id: string                 // command_id (UUID, idempotency)
    type: CommandType
    args: string[]
    raw: string
}

export interface CommandResult {
    success: boolean
    message: string
    errorCode?: ErrorCode
    data?: unknown
}

// === LLM 어댑터 (7절) ===

export type LLMProvider = 'gemini_api' | 'codex_bridge' | 'openai_api'

export interface LLMResult {
    content: string
    model: string
    usage?: {
        prompt_tokens: number
        completion_tokens: number
    }
}

export interface LLMAdapter {
    provider: LLMProvider
    run(command: string, payload: unknown): Promise<LLMResult>
}

// === 스케줄러 (4.3절) ===

export type BlockMinutes = 25 | 50 | 90

export interface ScheduleSlot {
    work_item_id: string
    start: string              // ISO 8601
    end: string                // ISO 8601
    block_minutes: BlockMinutes
}

export interface ScheduleInput {
    available_minutes: number
    fixed_events: FixedEvent[]
    candidates: WorkItem[]
    deadlines: ProjectDeadline[]   // C6: 스케줄러 결정에 필수
}

export interface SchedulePlan {
    slots: ScheduleSlot[]
    available_minutes: number
    used_minutes: number
    recommended_active_count: number
}

// === 이벤트 파이프라인 (10절) ===

export type EventStage =
    | 'triggered'
    | 'classified'
    | 'proposed'
    | 'confirmed'
    | 'applied'
    | 'logged'

// === AI 제안 출력 규격 (6.4절) ===

export interface AISuggestionOption {
    label: string              // A, B, C
    description: string
    time_cost: string
    risk: string
    expected_effect: string
}

export interface AISuggestion {
    options: AISuggestionOption[]
    recommended: string        // 권장안 label
}
