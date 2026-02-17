// ============================================
// SuggestionPanel — 명령 자동완성 / AI 옵션 A/B/C
// ============================================

import type { AISuggestionOption, CommandSuggestion } from '../../types/ui'

type SuggestionPanelProps =
    | {
        mode?: 'command'
        suggestions: CommandSuggestion[]
        activeIndex: number
        onSelect: (suggestion: CommandSuggestion) => void
        visible: boolean
      }
    | {
        mode: 'ai'
        options: AISuggestionOption[]
        recommended: 'A' | 'B' | 'C'
        visible: boolean
      }

export function SuggestionPanel(props: SuggestionPanelProps) {
    if (!props.visible) return null

    if (props.mode === 'ai') {
        return (
            <div className="ai-suggestion-panel" role="region" aria-label="AI 제안 옵션">
                {props.options.map((option) => (
                    <article key={option.label} className={`ai-suggestion-card${props.recommended === option.label ? ' is-recommended' : ''}`}>
                        <header>
                            <strong>Option {option.label}</strong>
                            {props.recommended === option.label ? <span>권장</span> : null}
                        </header>
                        <p>{option.title}</p>
                        <ul>
                            <li>시간: {option.timeCost}</li>
                            <li>리스크: {option.risk}</li>
                            <li>효과: {option.expectedEffect}</li>
                        </ul>
                    </article>
                ))}
            </div>
        )
    }

    if (props.suggestions.length === 0) return null

    return (
        <ul className="command-suggestions" role="listbox" aria-label="명령 자동완성">
            {props.suggestions.map((suggestion, index) => (
                <li key={suggestion.command}>
                    <button
                        type="button"
                        className={`command-suggestions__item${index === props.activeIndex ? ' is-active' : ''}`}
                        onClick={() => props.onSelect(suggestion)}
                    >
                        <div className="command-suggestions__row">
                            <code>{suggestion.command}</code>
                            <span>{suggestion.argHints}</span>
                        </div>
                        <div className="command-suggestions__meta">
                            <span>{suggestion.description}</span>
                            <code>{suggestion.example}</code>
                        </div>
                    </button>
                </li>
            ))}
        </ul>
    )
}
