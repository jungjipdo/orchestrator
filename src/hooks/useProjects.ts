// ==========================================
// useProjects — 프로젝트 목록 + CRUD 훅
// ==========================================

import { useState, useCallback, useEffect } from 'react'
import {
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    type Project,
    type CreateProjectInput,
} from '../lib/supabase/projects'

/** Tauri 환경인지 체크 */
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

interface UseProjectsReturn {
    projects: Project[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    importProject: (input: CreateProjectInput) => Promise<Project>
    updateProjectStatus: (id: string, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>) => Promise<Project>
    removeProject: (id: string) => Promise<void>
}

export function useProjects(): UseProjectsReturn {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            if (isTauri()) {
                const { invoke } = await import('@tauri-apps/api/core')
                const data = await invoke<Project[]>('db_get_projects')
                setProjects(Array.isArray(data) ? data : [])
            } else {
                const data = await fetchProjects()
                setProjects(data)
            }
            setError(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch projects')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    const importProject = useCallback(async (input: CreateProjectInput) => {
        if (isTauri()) {
            const { invoke } = await import('@tauri-apps/api/core')
            const project: Project = {
                id: crypto.randomUUID(),
                repo_id: input.repo_id,
                repo_name: input.repo_name,
                repo_full_name: input.repo_full_name,
                repo_url: input.repo_url,
                description: input.description ?? null,
                default_branch: input.default_branch ?? 'main',
                language: input.language ?? null,
                is_private: input.is_private ?? false,
                status: 'active',
                metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
            await invoke('db_upsert_project', { project })
            setProjects((prev) => [project, ...prev])
            return project
        } else {
            const project = await createProject(input)
            setProjects((prev) => [project, ...prev])
            return project
        }
    }, [])

    const updateProjectStatus = useCallback(async (id: string, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>) => {
        if (isTauri()) {
            const existing = projects.find((p) => p.id === id)
            if (!existing) throw new Error('Project not found')
            const updated = { ...existing, ...updates, updated_at: new Date().toISOString() }
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('db_upsert_project', { project: updated })
            setProjects((prev) => prev.map((p) => p.id === id ? updated : p))
            return updated
        } else {
            const updated = await updateProject(id, updates)
            setProjects((prev) => prev.map((p) => p.id === id ? updated : p))
            return updated
        }
    }, [projects])

    const removeProject = useCallback(async (id: string) => {
        console.log('[useProjects] removeProject 호출:', id)
        try {
            if (isTauri()) {
                const { invoke } = await import('@tauri-apps/api/core')
                console.log('[useProjects] Tauri db_delete_project 호출:', id)
                await invoke('db_delete_project', { id })
                console.log('[useProjects] Tauri db_delete_project 성공:', id)
            } else {
                console.log('[useProjects] Supabase deleteProject 호출:', id)
                await deleteProject(id)
                console.log('[useProjects] Supabase deleteProject 성공:', id)
            }
            setProjects((prev) => prev.filter((p) => p.id !== id))
            console.log('[useProjects] UI에서 프로젝트 제거 완료:', id)
        } catch (err) {
            console.error('[useProjects] removeProject 실패:', id, err)
            throw err
        }
    }, [])

    return {
        projects,
        loading,
        error,
        refresh,
        importProject,
        updateProjectStatus,
        removeProject,
    }
}
