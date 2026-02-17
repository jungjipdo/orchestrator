// ============================================
// UI Types
// ============================================

import type { CommandType, ErrorCode } from './index'

export interface OutletContextType {
    refreshTrigger: number
    refresh: () => void
}

export interface CommandResultView {
    status: 'success' | 'error' | 'info'
    message: string
    errorCode?: ErrorCode
    autoDismissMs?: number | null
}

export interface CommandSuggestion {
    command: `/${CommandType}`
    description: string
    argHints: string
    example: string
}

export interface AISuggestionOption {
    label: 'A' | 'B' | 'C'
    title: string
    timeCost: string
    risk: string
    expectedEffect: string
}
