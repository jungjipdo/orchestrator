// ============================================
// NotificationPanel — 알림 드롭다운 패널
// 이모지 없이, 컬러 도트 + 텍스트 라벨로 직관적 표시
// ============================================

import { useRef, useEffect } from 'react'
import type { AppNotification } from '../../hooks/useNotifications'
import { X } from 'lucide-react'

interface NotificationPanelProps {
    notifications: AppNotification[]
    onMarkAllRead: () => void
    onClearAll: () => void
    onClose: () => void
}

const TYPE_CONFIG: Record<AppNotification['type'], { label: string; dotColor: string }> = {
    violation: { label: '위반', dotColor: 'bg-red-500' },
    change: { label: '변경', dotColor: 'bg-blue-500' },
    sync: { label: '동기화', dotColor: 'bg-green-500' },
    info: { label: '정보', dotColor: 'bg-muted-foreground' },
}

function timeAgo(timestamp: number): string {
    const diff = Math.floor((Date.now() - timestamp) / 1000)
    if (diff < 60) return `${diff}초 전`
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
}

export function NotificationPanel({ notifications, onMarkAllRead, onClearAll, onClose }: NotificationPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        // 다음 tick에 추가 (열기 클릭 자체가 닫히는 것 방지)
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
        }, 0)
        return () => {
            clearTimeout(timer)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [onClose])

    return (
        <div
            ref={panelRef}
            className="absolute right-0 top-full mt-2 w-80 max-h-[400px] rounded-xl border bg-background shadow-lg z-50 overflow-hidden"
        >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-medium">알림</span>
                <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={onMarkAllRead}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                모두 읽음
                            </button>
                            <button
                                type="button"
                                onClick={onClearAll}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                지우기
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-0.5 rounded hover:bg-muted transition-colors"
                    >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* 알림 목록 */}
            <div className="overflow-y-auto max-h-[340px]">
                {notifications.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        알림이 없습니다
                    </div>
                ) : (
                    notifications.map(n => {
                        const config = TYPE_CONFIG[n.type]
                        return (
                            <div
                                key={n.id}
                                className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors ${n.read ? 'opacity-60' : 'bg-muted/20'
                                    }`}
                            >
                                {/* 컬러 도트 */}
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dotColor}`} />

                                {/* 내용 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {config.label}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/60">
                                            {timeAgo(n.timestamp)}
                                        </span>
                                    </div>
                                    <p className="text-sm mt-0.5 truncate">{n.message}</p>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
