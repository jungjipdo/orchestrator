// ============================================
// useConsent — 데이터 수집 동의 관리 훅
// ============================================

import { useState, useEffect, useCallback } from 'react'

/** Tauri 환경인지 체크 */
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export interface ConsentState {
    /** 온보딩 완료 여부 */
    onboardingDone: boolean
    /** 모델 개선 데이터 수집 동의 */
    dataCollection: boolean
    /** 멀티 디바이스 동기화 동의 */
    syncConsent: boolean
}

interface UseConsentReturn {
    consent: ConsentState
    loading: boolean
    /** 온보딩에서 동의 설정 */
    setInitialConsent: (data: { dataCollection: boolean; syncConsent: boolean }) => Promise<void>
    /** Settings에서 개별 토글 */
    toggleDataCollection: (value: boolean) => Promise<void>
    toggleSyncConsent: (value: boolean) => Promise<void>
    /** 온보딩 필요 여부 */
    needsOnboarding: boolean
}

// 로컬 스토리지 기반 (웹용 폴백)
const WEB_STORAGE_KEY = 'orchestrator_consent'

function getWebConsent(): ConsentState {
    try {
        const raw = localStorage.getItem(WEB_STORAGE_KEY)
        if (raw) return JSON.parse(raw) as ConsentState
    } catch { /* ignore */ }
    return { onboardingDone: false, dataCollection: false, syncConsent: false }
}

function setWebConsent(state: ConsentState) {
    localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(state))
}

export function useConsent(): UseConsentReturn {
    const [consent, setConsent] = useState<ConsentState>({
        onboardingDone: false,
        dataCollection: false,
        syncConsent: false,
    })
    const [loading, setLoading] = useState(true)

    // 초기 로드
    useEffect(() => {
        void (async () => {
            try {
                if (isTauri()) {
                    const { invoke } = await import('@tauri-apps/api/core')
                    const done = await invoke<string | null>('db_get_preference', { key: 'onboarding_done' })
                    const dc = await invoke<string | null>('db_get_preference', { key: 'data_collection_consent' })
                    const sc = await invoke<string | null>('db_get_preference', { key: 'sync_consent' })
                    setConsent({
                        onboardingDone: done === 'true',
                        dataCollection: dc === 'true',
                        syncConsent: sc === 'true',
                    })
                } else {
                    setConsent(getWebConsent())
                }
            } catch {
                // 기본값 유지
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const savePreference = useCallback(async (key: string, value: string) => {
        if (isTauri()) {
            const { invoke } = await import('@tauri-apps/api/core')
            await invoke('db_set_preference', { key, value })
        }
    }, [])

    const setInitialConsent = useCallback(async (data: { dataCollection: boolean; syncConsent: boolean }) => {
        const newState: ConsentState = {
            onboardingDone: true,
            dataCollection: data.dataCollection,
            syncConsent: data.syncConsent,
        }

        if (isTauri()) {
            await savePreference('onboarding_done', 'true')
            await savePreference('data_collection_consent', String(data.dataCollection))
            await savePreference('sync_consent', String(data.syncConsent))
        } else {
            setWebConsent(newState)
        }

        setConsent(newState)
    }, [savePreference])

    const toggleDataCollection = useCallback(async (value: boolean) => {
        const newState = { ...consent, dataCollection: value }
        if (isTauri()) {
            await savePreference('data_collection_consent', String(value))
        } else {
            setWebConsent(newState)
        }
        setConsent(newState)
    }, [consent, savePreference])

    const toggleSyncConsent = useCallback(async (value: boolean) => {
        const newState = { ...consent, syncConsent: value }
        if (isTauri()) {
            await savePreference('sync_consent', String(value))
        } else {
            setWebConsent(newState)
        }
        setConsent(newState)
    }, [consent, savePreference])

    return {
        consent,
        loading,
        setInitialConsent,
        toggleDataCollection,
        toggleSyncConsent,
        needsOnboarding: !loading && !consent.onboardingDone,
    }
}
