// ============================================
// useUpdater — Tauri 앱 자동 업데이트 훅
// 앱 실행 시 업데이트 체크 → 상태 반환
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { isTauri } from '../lib/tauri/isTauri'

interface UpdateInfo {
    version: string
    date: string
    body: string
}

interface UseUpdaterReturn {
    /** 업데이트 가능 여부 */
    updateAvailable: boolean
    /** 업데이트 정보 (버전, 날짜, 릴리스 노트) */
    updateInfo: UpdateInfo | null
    /** 다운로드 진행 중 */
    downloading: boolean
    /** 에러 메시지 */
    error: string | null
    /** 업데이트 다운로드 + 설치 + 재시작 */
    installUpdate: () => Promise<void>
    /** 수동 체크 */
    checkForUpdate: () => Promise<void>
}

export function useUpdater(): UseUpdaterReturn {
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
    const [downloading, setDownloading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // 내부적으로 update 객체를 보관
    const [pendingUpdate, setPendingUpdate] = useState<unknown>(null)

    const checkForUpdate = useCallback(async () => {
        if (!isTauri()) return

        try {
            const { check } = await import('@tauri-apps/plugin-updater')
            const update = await check()

            if (update) {
                setUpdateAvailable(true)
                setUpdateInfo({
                    version: update.version,
                    date: update.date ?? '',
                    body: update.body ?? '',
                })
                setPendingUpdate(update)
            } else {
                setUpdateAvailable(false)
                setUpdateInfo(null)
            }
        } catch (e) {
            console.error('[Updater] 업데이트 체크 실패:', e)
            setError(e instanceof Error ? e.message : String(e))
        }
    }, [])

    const installUpdate = useCallback(async () => {
        if (!pendingUpdate) return

        try {
            setDownloading(true)
            setError(null)

            // @ts-expect-error - dynamic import type
            await pendingUpdate.downloadAndInstall()

            // 설치 완료 → 앱 재시작
            const { relaunch } = await import('@tauri-apps/plugin-process')
            await relaunch()
        } catch (e) {
            console.error('[Updater] 업데이트 설치 실패:', e)
            setError(e instanceof Error ? e.message : String(e))
            setDownloading(false)
        }
    }, [pendingUpdate])

    // 앱 시작 시 자동 체크
    useEffect(() => {
        void checkForUpdate()
    }, [checkForUpdate])

    return {
        updateAvailable,
        updateInfo,
        downloading,
        error,
        installUpdate,
        checkForUpdate,
    }
}
