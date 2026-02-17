// ============================================
// EmptyState — 빈 상태 표시
// ============================================

interface EmptyStateProps {
    message: string
    subMessage?: string
    icon?: string
    action?: {
        label: string
        onClick: () => void
        disabled?: boolean
    }
    className?: string
}

export function EmptyState({
    message,
    subMessage,
    icon = '📭',
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`empty-state ${className}`.trim()}>
            <div className="empty-state__icon" aria-hidden="true">{icon}</div>
            <p className="empty-state__message">{message}</p>
            {subMessage ? <p className="empty-state__sub">{subMessage}</p> : null}
            {action ? (
                <button
                    type="button"
                    className="empty-state__action"
                    onClick={action.onClick}
                    disabled={action.disabled}
                >
                    {action.label}
                </button>
            ) : null}
        </div>
    )
}
