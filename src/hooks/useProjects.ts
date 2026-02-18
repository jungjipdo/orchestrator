// ============================================
// useProjects — 프로젝트 목록 + CRUD 훅
// ============================================

import { useState, useCallback, useEffect } from 'react'
import {
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    type Project,
    type CreateProjectInput,
} from '../lib/supabase/projects'

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
            const data = await fetchProjects()
            setProjects(data)
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
        const project = await createProject(input)
        setProjects((prev) => [project, ...prev])
        return project
    }, [])

    const updateProjectStatus = useCallback(async (id: string, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>) => {
        const updated = await updateProject(id, updates)
        setProjects((prev) => prev.map((p) => p.id === id ? updated : p))
        return updated
    }, [])

    const removeProject = useCallback(async (id: string) => {
        await deleteProject(id)
        setProjects((prev) => prev.filter((p) => p.id !== id))
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
