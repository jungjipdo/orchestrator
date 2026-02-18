// ============================================
// WorkItemCard — 후보/활성 작업 카드
// ============================================

import type { WorkItemRow } from '../../types/database'
import { StatusBadge } from '../common/StatusBadge'

interface WorkItemCardProps {
    item: WorkItemRow
    onFocus?: (id: string) => void
    disableFocus?: boolean
}

function formatDueDate(iso: string | null): string {
    if (!iso) return '-'

    const date = new Date(iso)
    return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export function WorkItemCard({ item, onFocus, disableFocus = false }: WorkItemCardProps) {
    const cannotFocus = disableFocus || !item.next_action

    return (
        <article className="work-item-card">
            <div className="work-item-card__header">
                <h4 className="work-item-card__title" title={item.title}>{item.title}</h4>
                <StatusBadge status={item.status} />
            </div>

            <p className="work-item-card__next-action">
                <span>next_action</span>
                <strong className={item.next_action ? '' : 'is-unset'}>{item.next_action ?? '미설정'}</strong>
            </p>

            <div className="work-item-card__meta">
                <span>estimate {item.estimate_min ?? '?'}m</span>
                <span>energy {item.energy ?? 'medium'}</span>
                <span>due {formatDueDate(item.due_at)}</span>
            </div>

            {onFocus ? (
                <button
                    type="button"
                    className="work-item-card__focus"
                    onClick={() => onFocus(item.id)}
                    disabled={cannotFocus}
                    title={!item.next_action ? 'next_action이 있어야 Focus 가능합니다.' : ''}
                >
                    Focus
                </button>
            ) : null}
        </article>
    )
}
