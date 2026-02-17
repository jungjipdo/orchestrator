// ============================================
// CommandResult — 명령 실행 결과 표시
// ============================================

import { useEffect } from 'react'
import type { CommandResultView } from '../../types/ui'

interface CommandResultProps {
    result: CommandResultView | null
    onClose: () => void
}

export function CommandResult({ result, onClose }: CommandResultProps) {
    useEffect(() => {
        if (!result) return
        if (result.status === 'error') return

        const dismissMs = result.autoDismissMs ?? 3500
        if (dismissMs <= 0) return

        const timer = window.setTimeout(() => onClose(), dismissMs)
        return () => window.clearTimeout(timer)
    }, [result, onClose])

    if (!result) return null

    return (
        <div className={`command-result command-result--${result.status}`} role="status" aria-live="polite">
            <span className="command-result__message">{result.message}</span>
            <button type="button" className="command-result__close" onClick={onClose} aria-label="결과 닫기">
                ×
            </button>
        </div>
    )
}
