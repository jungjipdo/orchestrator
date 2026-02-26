// ============================================
// useNotifications — 프론트엔드 알림 상태 관리
// Tauri 이벤트 수신 + 로컬 알림 목록 관리
// ============================================

import { useState, useEffect, useCallback } from 'react'

export interface AppNotification {
    id: string
    type: 'violation' | 'change' | 'sync' | 'info'
    title: string
    message: string
    timestamp: number
    read: boolean
}

const MAX_NOTIFICATIONS = 50

import { isTauri } from '../lib/tauri/isTauri'

export function useNotifications() {
    const [notifications, setNotifications] = useState<AppNotification[]>([])

    // Tauri 이벤트 리스너
    useEffect(() => {
        if (!isTauri) return

        let unlisten: (() => void) | null = null

        const setup = async () => {
            const { listen } = await import('@tauri-apps/api/event')

            // orchx:file-change 이벤트 수신
            unlisten = await listen<{
                path: string
                event_type: string
                violation: string | null
            }>('orchx:file-change', (event) => {
                const { path, violation } = event.payload

                if (violation) {
                    // 위반 감지 알림
                    addNotification({
                        type: 'violation',
                        title: '계약 위반 감지',
                        message: `${path} — ${violation}`,
                    })
                }
            })
        }

        setup().catch(console.error)

        return () => {
            unlisten?.()
        }
    }, [])

    const addNotification = useCallback((partial: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
        const notification: AppNotification = {
            ...partial,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            read: false,
        }

        setNotifications(prev => {
            const next = [notification, ...prev]
            return next.slice(0, MAX_NOTIFICATIONS)
        })
    }, [])

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }, [])

    const clearAll = useCallback(() => {
        setNotifications([])
    }, [])

    const unreadCount = notifications.filter(n => !n.read).length

    return {
        notifications,
        unreadCount,
        addNotification,
        markAllRead,
        clearAll,
    }
}
