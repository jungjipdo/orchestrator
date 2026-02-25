// ============================================
// useWatcher.ts — Tauri watcher 연동 훅
// import된 프로젝트 자동 감시 제어
// ============================================

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useState } from 'react'

/** Tauri 환경인지 체크 */
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** Watcher 상태 */
interface WatchStatus {
    enabled: boolean
    projects: {
        repo_full_name: string
        path: string
        watching: boolean
    }[]
}

/** 파일 변경 이벤트 */
interface FileChangeEvent {
    path: string
    event_type: 'change' | 'add' | 'unlink'
    violation: string | null
}

interface UseWatcherReturn {
    /** Tauri 앱에서 실행 중인지 */
    isTauriApp: boolean
    /** 전체 감시 상태 */
    watchStatus: WatchStatus | null
    /** 프로젝트 감시 추가 */
    addProject: (repoFullName: string, localPath: string) => Promise<void>
    /** 프로젝트 감시 제거 */
    removeProject: (repoFullName: string) => Promise<void>
    /** 전체 감시 토글 */
    toggleAll: () => Promise<void>
    /** 자동 스캔 + 감시 시작 */
    autoScanAndWatch: (repoUrls: string[]) => Promise<number>
    /** 스캔 중 */
    scanning: boolean
    /** 최근 파일 변경 이벤트 */
    recentChanges: FileChangeEvent[]
    /** 에러 메시지 */
    error: string | null
}

export function useWatcher(): UseWatcherReturn {
    const tauriApp = isTauri()
    const [watchStatus, setWatchStatus] = useState<WatchStatus | null>(null)
    const [recentChanges, setRecentChanges] = useState<FileChangeEvent[]>([])
    const [error, setError] = useState<string | null>(null)
    const [scanning, setScanning] = useState(false)

    // 상태 새로고침
    const refreshStatus = useCallback(async () => {
        if (!tauriApp) return
        try {
            const status = await invoke<WatchStatus>('get_watch_status')
            setWatchStatus(status)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        }
    }, [tauriApp])

    // 파일 변경 이벤트 리스너
    useEffect(() => {
        if (!tauriApp) return

        refreshStatus()

        const unlisten = listen<FileChangeEvent>('orchx:file-change', (event) => {
            setRecentChanges((prev) => [event.payload, ...prev].slice(0, 50))
        })

        return () => {
            unlisten.then((fn) => fn())
        }
    }, [tauriApp, refreshStatus])

    const addProject = useCallback(
        async (repoFullName: string, localPath: string) => {
            if (!tauriApp) return
            try {
                await invoke('add_watch_project', {
                    repoFullName,
                    path: localPath,
                })
                await refreshStatus()
                setError(null)
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
            }
        },
        [tauriApp, refreshStatus],
    )

    const removeProject = useCallback(
        async (repoFullName: string) => {
            if (!tauriApp) return
            try {
                await invoke('remove_watch_project', { repoFullName })
                await refreshStatus()
                setError(null)
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
            }
        },
        [tauriApp, refreshStatus],
    )

    const toggleAll = useCallback(async () => {
        if (!tauriApp) return
        try {
            const result = await invoke<WatchStatus>('toggle_watch_all')
            setWatchStatus(result)
            setError(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        }
    }, [tauriApp])

    const autoScanAndWatch = useCallback(async (repoUrls: string[]): Promise<number> => {
        if (!tauriApp || repoUrls.length === 0) return 0
        setScanning(true)
        try {
            const pathMap = await invoke<Record<string, string>>('resolve_local_paths', { repoUrls })
            let count = 0
            for (const [repoFullName, localPath] of Object.entries(pathMap)) {
                await invoke('add_watch_project', { repoFullName, path: localPath })
                count++
            }
            await refreshStatus()
            setError(null)
            return count
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
            return 0
        } finally {
            setScanning(false)
        }
    }, [tauriApp, refreshStatus])

    return {
        isTauriApp: tauriApp,
        watchStatus,
        addProject,
        removeProject,
        toggleAll,
        autoScanAndWatch,
        scanning,
        recentChanges,
        error,
    }
}
