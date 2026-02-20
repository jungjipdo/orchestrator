// ============================================
// projects.ts — Projects CRUD 레이어
// GitHub 레포 기반 프로젝트 관리 (plans와 독립)
// ============================================

import { supabase } from './client'
import { requireUserId } from './auth'

// ─── Types ───

export interface Project {
    id: string
    repo_id: number
    repo_name: string
    repo_full_name: string
    repo_url: string
    description: string | null
    default_branch: string
    language: string | null
    is_private: boolean
    status: 'backlog' | 'active' | 'archived' | 'completed'
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface CreateProjectInput {
    repo_id: number
    repo_name: string
    repo_full_name: string
    repo_url: string
    description?: string | null
    default_branch?: string
    language?: string | null
    is_private?: boolean
}

// ─── CRUD ───

/** 모든 프로젝트 조회 */
export async function fetchProjects(): Promise<Project[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as Project[]
}

/** 프로젝트 생성 (레포 import) */
export async function createProject(input: CreateProjectInput): Promise<Project> {
    const user_id = await requireUserId()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('projects')
        .insert({
            repo_id: input.repo_id,
            repo_name: input.repo_name,
            repo_full_name: input.repo_full_name,
            repo_url: input.repo_url,
            description: input.description ?? null,
            default_branch: input.default_branch ?? 'main',
            language: input.language ?? null,
            is_private: input.is_private ?? false,
            status: 'backlog',
            user_id,
        })
        .select()
        .single()

    if (error) throw error
    return data as Project
}

/** 프로젝트 수정 (status 변경 등) */
export async function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Promise<Project> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Project
}

/** 프로젝트 삭제 */
export async function deleteProject(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from('projects')
        .delete()
        .eq('id', id)

    if (error) throw error
}

/** 레포가 이미 프로젝트로 등록됐는지 확인 */
export async function isRepoImported(repoId: number): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('projects')
        .select('id')
        .eq('repo_id', repoId)
        .maybeSingle()

    if (error) throw error
    return data !== null
}
