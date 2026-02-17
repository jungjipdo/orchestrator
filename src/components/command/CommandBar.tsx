// ============================================
// CommandBar — Slash 보조 입력창
// ============================================

import type { FormEvent, KeyboardEvent } from 'react'

interface CommandBarProps {
    value: string
    disabled?: boolean
    placeholder?: string
    onChange: (value: string) => void
    onSubmit: () => void
    onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
    onFocus?: () => void
    onBlur?: () => void
}

export function CommandBar({
    value,
    disabled = false,
    placeholder,
    onChange,
    onSubmit,
    onKeyDown,
    onFocus,
    onBlur,
}: CommandBarProps) {
    const handleSubmit = (event: FormEvent) => {
        event.preventDefault()
        onSubmit()
    }

    return (
        <form className="command-bar" onSubmit={handleSubmit}>
            <label className="command-bar__label" htmlFor="command-input">명령</label>
            <input
                id="command-input"
                type="text"
                className="command-bar__input"
                value={value}
                disabled={disabled}
                placeholder={placeholder ?? '/plan 180 또는 /focus {task_id}'}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                autoComplete="off"
                spellCheck={false}
            />
        </form>
    )
}
