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

// === 오케스트레이션: 에디터(도구) + AI 모델(두뇌) ===

// 에디터 — 사용자가 쓰는 개발 도구 (타일 토글로 등록)
export type EditorType =
    | 'cursor' | 'claude_code' | 'codex' | 'antigravity'

// AI 모델 — 2026.02.19 기준 최신 (오케스트레이터 추천용)
export type AIModel =
    // Anthropic
    | 'claude_opus_4_6' | 'claude_sonnet_4_6'
    // OpenAI
    | 'gpt_5_3_codex' | 'gpt_5_3_codex_spark' | 'gpt_5_2_codex'
    // Google
    | 'gemini_3_1_pro' | 'gemini_3_pro' | 'gemini_3_flash' | 'gemini_3_deep_think'
    // xAI
    | 'grok_code'
    // Moonshot
    | 'kimi_2_5'
    // Cursor
    | 'cursor_composer'

export type AgentStatus = 'registered' | 'active' | 'inactive' | 'error'

export type IntegrationLevel = 'L1' | 'L2' | 'L3'

export interface AgentConnection {
    id: string
    user_id: string
    editor_type: EditorType
    project_id: string | null
    status: AgentStatus
    integration_level: IntegrationLevel
    last_activity_at: string | null
    agent_meta: Record<string, unknown>
    created_at: string
    updated_at: string
}

// --- 오케스트레이션 단위 객체 ---

export type AgentTaskStatus =
    | 'pending' | 'running' | 'completed'
    | 'failed' | 'cancelled'

export interface AgentTask {
    id: string
    user_id: string
    agent_connection_id: string
    work_item_id: string | null
    instruction: string
    recommended_model: AIModel | null
    status: AgentTaskStatus
    started_at: string | null
    ended_at: string | null
    created_at: string
    updated_at: string
}

export type RunResultOutcome = 'success' | 'failure' | 'partial' | 'timeout'

export interface RunResult {
    id: string
    agent_task_id: string
    outcome: RunResultOutcome
    summary: string | null
    artifacts: string[]
    duration_ms: number | null
    error_message: string | null
    created_at: string
}

// --- 성공지표 이벤트 규격 ---

export type AgentEventType =
    | 'agent.registered' | 'agent.removed'
    | 'agent.session_started' | 'agent.session_ended'
    | 'agent.task_completed' | 'agent.task_failed'
    | 'agent.commit_pushed' | 'agent.pr_opened'
    | 'agent.blocked' | 'agent.unblocked'

export interface EventLog {
    id: string
    event_type: string
    payload: Record<string, unknown>
    triggered_at: string        // ISO 8601
    applied_at: string | null   // ISO 8601
    actor: 'user' | 'system' | 'ai'
    created_at: string
}

// === 에러 코드 표준 ===

export type ErrorCode =
    | 'MISSING_NEXT_ACTION'
    | 'MISSING_DONE_LOG'
    | 'INVALID_TRANSITION'
    | 'NO_ACTIVE_SESSION'
    | 'ACTIVE_SESSION_EXISTS'
    | 'SCHEDULE_CONFLICT'

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
