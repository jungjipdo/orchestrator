// ============================================
// ConfirmDialog — 중요 작업 확인 모달
// ============================================

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    message?: string
    children?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    confirmDisabled?: boolean
    onConfirm: () => void
    onCancel: () => void
    isDangerous?: boolean
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    children,
    confirmLabel = '확인',
    cancelLabel = '취소',
    confirmDisabled = false,
    onConfirm,
    onCancel,
    isDangerous = false,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return

        if (isOpen && !dialog.open) {
            dialog.showModal()
        }

        if (!isOpen && dialog.open) {
            dialog.close()
        }
    }, [isOpen])

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return

        const handleCancel = (event: Event) => {
            event.preventDefault()
            onCancel()
        }

        dialog.addEventListener('cancel', handleCancel)
        return () => dialog.removeEventListener('cancel', handleCancel)
    }, [onCancel])

    if (!isOpen) return null

    return (
        <dialog ref={dialogRef} className="confirm-dialog" onClose={onCancel}>
            <div className="confirm-dialog__content">
                <h3 className="confirm-dialog__title">{title}</h3>
                {message ? <p className="confirm-dialog__message">{message}</p> : null}
                {children ? <div className="confirm-dialog__body">{children}</div> : null}

                <div className="confirm-dialog__actions">
                    <button type="button" className="confirm-dialog__btn" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`confirm-dialog__btn confirm-dialog__btn--primary${isDangerous ? ' is-danger' : ''}`}
                        onClick={onConfirm}
                        disabled={confirmDisabled}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    )
}
