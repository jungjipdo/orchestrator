// ============================================
// UI Types
// ============================================

import type { ErrorCode } from './index'
import type { SessionLogRow } from './database'

export interface OutletContextType {
    refreshTrigger: number
    refresh: () => void
    activeSession: SessionLogRow | null
}

export interface CommandResultView {
    status: 'success' | 'error' | 'info'
    message: string
    errorCode?: ErrorCode
    autoDismissMs?: number | null
}

export interface AISuggestionOption {
    label: 'A' | 'B' | 'C'
    title: string
    timeCost: string
    risk: string
    expectedEffect: string
}
