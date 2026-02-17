// ============================================
// ActiveTaskPanel — 활성 작업 종료 패널
// ============================================

import { useState } from 'react'
import type { WorkItemRow } from '../../types/database'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { EmptyState } from '../common/EmptyState'
import { StatusBadge } from '../common/StatusBadge'

interface ActiveTaskPanelProps {
    activeItems: WorkItemRow[]
    onClose: (itemId: string, doneLog: string) => Promise<void>
}

export function ActiveTaskPanel({ activeItems, onClose }: ActiveTaskPanelProps) {
    const [pendingItem, setPendingItem] = useState<WorkItemRow | null>(null)
    const [doneLog, setDoneLog] = useState('')
    const [busy, setBusy] = useState(false)

    const requestClose = (item: WorkItemRow) => {
        setPendingItem(item)
        setDoneLog('')
    }

    const confirmClose = async () => {
        if (!pendingItem || !doneLog.trim()) return

        setBusy(true)
        try {
            await onClose(pendingItem.id, doneLog.trim())
            setPendingItem(null)
            setDoneLog('')
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="active-task-panel">
            <div className="active-task-panel__head">
                <h3>Active Task</h3>
                <span>done_log 필수</span>
            </div>

            {activeItems.length === 0 ? (
                <EmptyState
                    icon="🎯"
                    message="현재 활성 작업이 없습니다"
                    subMessage="Queue에서 Focus를 시작하세요"
                />
            ) : (
                <ul className="active-task-panel__list">
                    {activeItems.map((item) => (
                        <li key={item.id} className="active-task-card">
                            <div className="active-task-card__top">
                                <h4 title={item.title}>{item.title}</h4>
                                <StatusBadge status={item.status} />
                            </div>

                            <p className="active-task-card__next">
                                <span>next_action</span>
                                <strong>{item.next_action ?? '미설정'}</strong>
                            </p>

                            <button type="button" className="active-task-card__close" onClick={() => requestClose(item)}>
                                Close
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <ConfirmDialog
                isOpen={!!pendingItem}
                title="작업 종료"
                message="done_log를 입력해야 작업을 종료할 수 있습니다."
                confirmLabel="Close"
                cancelLabel="취소"
                confirmDisabled={!doneLog.trim() || busy}
                onCancel={() => setPendingItem(null)}
                onConfirm={() => void confirmClose()}
                isDangerous
            >
                <label className="active-task-panel__dialog-label" htmlFor="done-log-input">done_log</label>
                <input
                    id="done-log-input"
                    className="active-task-panel__dialog-input"
                    value={doneLog}
                    onChange={(event) => setDoneLog(event.target.value)}
                    placeholder="예: 슬롯 계산 결과 반영 및 테스트 완료"
                    disabled={busy}
                />
            </ConfirmDialog>
        </section>
    )
}
