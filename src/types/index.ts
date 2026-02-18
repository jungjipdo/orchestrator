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

// === Plan 시스템 ===

export type PlanType = 'task' | 'event' | 'fixed' | 'project'

export type PlanStatus = WorkItemStatus  // 동일 상태 모델 재사용

export type PlanPriority = 'low' | 'medium' | 'high' | 'critical'

export type ReminderOption = '30min' | '1h' | '1day' | '1week'

// === 반복 규칙 (Planfit recurrence.ts 알고리즘 참조) ===

export type RecurrenceType = 'daily' | 'weekly' | 'monthly'
export type RecurrenceEndType = 'never' | 'date' | 'count'

export interface RecurrenceRule {
    type: RecurrenceType
    weekDays?: number[]             // 0=일 ~ 6=토, weekly일 때만
    monthlyType?: 'date' | 'weekday'  // monthly일 때만
    endType: RecurrenceEndType
    endDate?: string                // endType='date'일 때, YYYY-MM-DD
    count?: number                  // endType='count'일 때
}

// 타입별 metadata 구조
export interface TaskMetadata {
    goals?: string
}

export interface EventMetadata {
    start_at: string           // ISO 8601
    end_at?: string            // ISO 8601
    location?: string
    reminders: ReminderOption[]
    fixed_event_id?: string    // fixed_events 테이블 연동 ID
}

export interface FixedMetadata {
    start_at: string           // ISO 8601
    end_at?: string            // ISO 8601
    location?: string
    reminders: ReminderOption[]
    recurrence?: RecurrenceRule  // 반복 없으면 undefined
    fixed_event_id?: string    // fixed_events 테이블 연동 ID
}

export interface ProjectMetadata {
    git_repo?: string
    goals?: string
    milestones?: string[]
}

export type PlanMetadata = TaskMetadata | EventMetadata | FixedMetadata | ProjectMetadata

export interface Plan {
    id: string
    title: string
    plan_type: PlanType
    status: PlanStatus
    priority: PlanPriority | null
    description: string | null
    due_at: string | null      // ISO 8601
    metadata: PlanMetadata
    created_at: string
    updated_at: string
}

// Plan 폼 입력 (모달에서 사용)
export interface PlanFormData {
    title: string
    plan_type: PlanType
    priority: PlanPriority
    description: string
    due_at: string
    // Event / Fixed 공용
    start_at: string
    start_time: string
    end_time: string
    location: string
    reminders: ReminderOption[]
    // Fixed 전용 — 반복 규칙
    is_recurring: boolean
    recurrence_type: RecurrenceType
    recurrence_weekDays: number[]
    recurrence_monthlyType: 'date' | 'weekday'
    recurrence_endType: RecurrenceEndType
    recurrence_endDate: string
    recurrence_count: number
    // Project 전용
    git_repo: string
}

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
