// ============================================
// Orchestrator — Supabase Database Types
// supabase-js v2 createClient<Database> 제네릭용
// ============================================

import type {
    WorkItemStatus,
    SessionResult,
    SyncMode,
    EnergyLevel,
    Importance,
    PlanType,
    PlanStatus,
    PlanPriority,
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
                    created_at?: string
                    updated_at?: string
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
            external_apps: {
                Row: {
                    id: string
                    name: string
                    role: string
                    status: 'active' | 'inactive'
                    deep_link_pattern: string | null
                    sync_mode: SyncMode
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    role: string
                    status?: 'active' | 'inactive'
                    deep_link_pattern?: string | null
                    sync_mode?: SyncMode
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    role?: string
                    status?: 'active' | 'inactive'
                    deep_link_pattern?: string | null
                    sync_mode?: SyncMode
                    created_at?: string
                }
                Relationships: []
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

export type ExternalAppRow = Database['public']['Tables']['external_apps']['Row']
export type ExternalAppInsert = Database['public']['Tables']['external_apps']['Insert']

export type EventLogRow = Database['public']['Tables']['event_logs']['Row']
export type EventLogInsert = Database['public']['Tables']['event_logs']['Insert']

export type PlanRow = Database['public']['Tables']['plans']['Row']
export type PlanInsert = Database['public']['Tables']['plans']['Insert']
export type PlanUpdate = Database['public']['Tables']['plans']['Update']
