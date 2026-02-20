// ============================================
// Orchestrator — Supabase Database Types
// supabase-js v2 createClient<Database> 제네릭용
// ============================================

import type {
    WorkItemStatus,
    SessionResult,
    EnergyLevel,
    Importance,
    PlanType,
    PlanStatus,
    PlanPriority,
    EditorType,
    AIModel,
    AgentStatus,
    IntegrationLevel,
    AgentTaskStatus,
    RunResultOutcome,
} from './index'

// === Supabase Database 타입 ===

export interface Database {
    public: {
        Tables: {
            work_items: {
                Row: {
                    id: string
                    project_id: string | null
                    title: string
                    status: WorkItemStatus
                    next_action: string | null
                    estimate_min: number | null
                    energy: EnergyLevel | null
                    due_at: string | null
                    source_app: string | null
                    source_ref: string | null
                    started_at: string | null
                    completed_at: string | null
                    deleted_at: string | null
                    actual_min: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    project_id?: string | null
                    title: string
                    status?: WorkItemStatus
                    next_action?: string | null
                    estimate_min?: number | null
                    energy?: EnergyLevel | null
                    due_at?: string | null
                    source_app?: string | null
                    source_ref?: string | null
                    started_at?: string | null
                    completed_at?: string | null
                    deleted_at?: string | null
                    actual_min?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    project_id?: string | null
                    title?: string
                    status?: WorkItemStatus
                    next_action?: string | null
                    estimate_min?: number | null
                    energy?: EnergyLevel | null
                    due_at?: string | null
                    source_app?: string | null
                    source_ref?: string | null
                    started_at?: string | null
                    completed_at?: string | null
                    deleted_at?: string | null
                    actual_min?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            github_connections: {
                Row: {
                    id: string
                    user_id: string
                    installation_id: number
                    github_username: string | null
                    access_token: string
                    refresh_token: string | null
                    token_expires_at: string | null
                    connected_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    installation_id: number
                    github_username?: string | null
                    access_token: string
                    refresh_token?: string | null
                    token_expires_at?: string | null
                }
                Update: {
                    github_username?: string | null
                    access_token?: string
                    refresh_token?: string | null
                    token_expires_at?: string | null
                }
                Relationships: []
            }
            fixed_events: {
                Row: {
                    id: string
                    title: string
                    start_at: string
                    end_at: string
                    importance: Importance
                    created_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    start_at: string
                    end_at: string
                    importance?: Importance
                    created_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    start_at?: string
                    end_at?: string
                    importance?: Importance
                    created_at?: string
                }
                Relationships: []
            }
            project_deadlines: {
                Row: {
                    id: string
                    project_id: string
                    milestone: string
                    deadline_at: string
                    risk_score: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    milestone: string
                    deadline_at: string
                    risk_score?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    project_id?: string
                    milestone?: string
                    deadline_at?: string
                    risk_score?: number
                    created_at?: string
                }
                Relationships: []
            }
            session_logs: {
                Row: {
                    id: string
                    work_item_id: string
                    started_at: string
                    ended_at: string | null
                    result: SessionResult | null
                    done_log: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    work_item_id: string
                    started_at?: string
                    ended_at?: string | null
                    result?: SessionResult | null
                    done_log?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    work_item_id?: string
                    started_at?: string
                    ended_at?: string | null
                    result?: SessionResult | null
                    done_log?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'session_logs_work_item_id_fkey'
                        columns: ['work_item_id']
                        isOneToOne: false
                        referencedRelation: 'work_items'
                        referencedColumns: ['id']
                    },
                ]
            }
            agent_connections: {
                Row: {
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
                Insert: {
                    id?: string
                    user_id?: string
                    editor_type: EditorType
                    project_id?: string | null
                    status?: AgentStatus
                    integration_level?: IntegrationLevel
                    last_activity_at?: string | null
                    agent_meta?: Record<string, unknown>
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    editor_type?: EditorType
                    project_id?: string | null
                    status?: AgentStatus
                    integration_level?: IntegrationLevel
                    last_activity_at?: string | null
                    agent_meta?: Record<string, unknown>
                    updated_at?: string
                }
                Relationships: []
            }
            agent_tasks: {
                Row: {
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
                Insert: {
                    id?: string
                    user_id?: string
                    agent_connection_id: string
                    work_item_id?: string | null
                    instruction: string
                    recommended_model?: AIModel | null
                    status?: AgentTaskStatus
                    started_at?: string | null
                    ended_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    agent_connection_id?: string
                    work_item_id?: string | null
                    instruction?: string
                    recommended_model?: AIModel | null
                    status?: AgentTaskStatus
                    started_at?: string | null
                    ended_at?: string | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'agent_tasks_agent_connection_id_fkey'
                        columns: ['agent_connection_id']
                        isOneToOne: false
                        referencedRelation: 'agent_connections'
                        referencedColumns: ['id']
                    },
                ]
            }
            run_results: {
                Row: {
                    id: string
                    agent_task_id: string
                    outcome: RunResultOutcome
                    summary: string | null
                    artifacts: string[]
                    duration_ms: number | null
                    error_message: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    agent_task_id: string
                    outcome: RunResultOutcome
                    summary?: string | null
                    artifacts?: string[]
                    duration_ms?: number | null
                    error_message?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    outcome?: RunResultOutcome
                    summary?: string | null
                    artifacts?: string[]
                    duration_ms?: number | null
                    error_message?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'run_results_agent_task_id_fkey'
                        columns: ['agent_task_id']
                        isOneToOne: false
                        referencedRelation: 'agent_tasks'
                        referencedColumns: ['id']
                    },
                ]
            }
            event_logs: {
                Row: {
                    id: string
                    event_type: string
                    payload: Record<string, unknown>
                    triggered_at: string
                    applied_at: string | null
                    actor: 'user' | 'system' | 'ai'
                    created_at: string
                }
                Insert: {
                    id?: string
                    event_type: string
                    payload?: Record<string, unknown>
                    triggered_at?: string
                    applied_at?: string | null
                    actor?: 'user' | 'system' | 'ai'
                    created_at?: string
                }
                Update: {
                    id?: string
                    event_type?: string
                    payload?: Record<string, unknown>
                    triggered_at?: string
                    applied_at?: string | null
                    actor?: 'user' | 'system' | 'ai'
                    created_at?: string
                }
                Relationships: []
            }
            plans: {
                Row: {
                    id: string
                    title: string
                    plan_type: PlanType
                    status: PlanStatus
                    priority: PlanPriority | null
                    description: string | null
                    due_at: string | null
                    metadata: Record<string, unknown>
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    plan_type: PlanType
                    status?: PlanStatus
                    priority?: PlanPriority | null
                    description?: string | null
                    due_at?: string | null
                    metadata?: Record<string, unknown>
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    plan_type?: PlanType
                    status?: PlanStatus
                    priority?: PlanPriority | null
                    description?: string | null
                    due_at?: string | null
                    metadata?: Record<string, unknown>
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            model_scores: {
                Row: {
                    id: string
                    user_id: string
                    model_key: string
                    coding: number
                    analysis: number
                    documentation: number
                    speed: number
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    model_key: string
                    coding?: number
                    analysis?: number
                    documentation?: number
                    speed?: number
                    updated_at?: string
                }
                Update: {
                    model_key?: string
                    coding?: number
                    analysis?: number
                    documentation?: number
                    speed?: number
                    updated_at?: string
                }
                Relationships: []
            }
            editor_models: {
                Row: {
                    id: string
                    user_id: string
                    editor_type: string
                    supported_models: string[]
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    editor_type: string
                    supported_models: string[]
                    updated_at?: string
                }
                Update: {
                    editor_type?: string
                    supported_models?: string[]
                    updated_at?: string
                }
                Relationships: []
            }
        }
        Views: Record<string, never>
        Functions: Record<string, never>
        Enums: Record<string, never>
        CompositeTypes: Record<string, never>
    }
}

// === 편의 타입 별칭 (CRUD 코드에서 사용) ===

export type WorkItemRow = Database['public']['Tables']['work_items']['Row']
export type WorkItemInsert = Database['public']['Tables']['work_items']['Insert']
export type WorkItemUpdate = Database['public']['Tables']['work_items']['Update']

export type FixedEventRow = Database['public']['Tables']['fixed_events']['Row']
export type FixedEventInsert = Database['public']['Tables']['fixed_events']['Insert']
export type FixedEventUpdate = Database['public']['Tables']['fixed_events']['Update']

export type ProjectDeadlineRow = Database['public']['Tables']['project_deadlines']['Row']
export type ProjectDeadlineInsert = Database['public']['Tables']['project_deadlines']['Insert']
export type ProjectDeadlineUpdate = Database['public']['Tables']['project_deadlines']['Update']

export type SessionLogRow = Database['public']['Tables']['session_logs']['Row']
export type SessionLogInsert = Database['public']['Tables']['session_logs']['Insert']
export type SessionLogUpdate = Database['public']['Tables']['session_logs']['Update']

export type AgentConnectionRow = Database['public']['Tables']['agent_connections']['Row']
export type AgentConnectionInsert = Database['public']['Tables']['agent_connections']['Insert']
export type AgentConnectionUpdate = Database['public']['Tables']['agent_connections']['Update']

export type AgentTaskRow = Database['public']['Tables']['agent_tasks']['Row']
export type AgentTaskInsert = Database['public']['Tables']['agent_tasks']['Insert']
export type AgentTaskUpdate = Database['public']['Tables']['agent_tasks']['Update']

export type RunResultRow = Database['public']['Tables']['run_results']['Row']
export type RunResultInsert = Database['public']['Tables']['run_results']['Insert']
export type RunResultUpdate = Database['public']['Tables']['run_results']['Update']

export type EventLogRow = Database['public']['Tables']['event_logs']['Row']
export type EventLogInsert = Database['public']['Tables']['event_logs']['Insert']

export type PlanRow = Database['public']['Tables']['plans']['Row']
export type PlanInsert = Database['public']['Tables']['plans']['Insert']
export type PlanUpdate = Database['public']['Tables']['plans']['Update']

export type ModelScoreRow = Database['public']['Tables']['model_scores']['Row']
export type ModelScoreInsert = Database['public']['Tables']['model_scores']['Insert']
export type ModelScoreUpdate = Database['public']['Tables']['model_scores']['Update']

export type EditorModelRow = Database['public']['Tables']['editor_models']['Row']
export type EditorModelInsert = Database['public']['Tables']['editor_models']['Insert']
export type EditorModelUpdate = Database['public']['Tables']['editor_models']['Update']
