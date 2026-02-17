// ============================================
// CommandToolbar — GUI 우선 + Slash 보조 명령 인터페이스
// ============================================

import { useMemo, useState, useCallback } from 'react'
import { parseCommand } from '../../features/workflow/commandParser'
import { executeCommand } from '../../features/workflow/commandExecutor'
import { getWorkItems } from '../../lib/supabase/workItems'
import type { SessionLogRow } from '../../types/database'
import type { CommandResultView, CommandSuggestion } from '../../types/ui'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { CommandBar } from './CommandBar'
import { CommandResult } from './CommandResult'
import { SuggestionPanel } from './SuggestionPanel'

interface CommandToolbarProps {
    activeSession: SessionLogRow | null
    onCommandComplete?: () => void
}

const COMMAND_CATALOG: CommandSuggestion[] = [
    {
        command: '/capture',
        description: '작업을 backlog로 빠르게 저장',
        argHints: '[text]',
        example: '/capture API 문서 정리',
    },
    {
        command: '/clarify',
        description: 'next_action/estimate 구조화',
        argHints: '[task_id] [next_action]',
        example: '/clarify a1b2 parser 연결하기',
    },
    {
        command: '/plan',
        description: '가용시간 기준 슬롯 제안 생성',
        argHints: '[minutes]',
        example: '/plan 180',
    },
    {
        command: '/focus',
        description: '작업 시작(활성 세션 생성)',
        argHints: '[task_id]',
        example: '/focus 123e4567',
    },
    {
        command: '/close',
        description: '작업 종료(done_log 필수)',
        argHints: '[task_id] [done_log]',
        example: '/close 123e4567 구현 완료',
    },
    {
        command: '/review',
        description: '회고 리포트 요청',
        argHints: '[daily|weekly|monthly]',
        example: '/review daily',
    },
    {
        command: '/reschedule',
        description: '일정 재배치 제안 생성',
        argHints: '[reason]',
        example: '/reschedule 긴급 미팅 반영',
    },
]

export function CommandToolbar({ activeSession, onCommandComplete }: CommandToolbarProps) {
    const [input, setInput] = useState('')
    const [executing, setExecuting] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [result, setResult] = useState<CommandResultView | null>(null)

    const [closeDialogOpen, setCloseDialogOpen] = useState(false)
    const [doneLog, setDoneLog] = useState('')

    const filteredSuggestions = useMemo(() => {
        if (!input.startsWith('/')) return []

        const token = input.slice(1).trim().toLowerCase()
        if (!token) return COMMAND_CATALOG

        return COMMAND_CATALOG.filter((item) => item.command.slice(1).startsWith(token))
    }, [input])

    const executeInput = useCallback(async (rawCommand: string) => {
        const parsed = parseCommand(rawCommand)
        if (!parsed.success) {
            setResult({ status: 'error', message: parsed.error, autoDismissMs: null })
            return
        }

        setExecuting(true)
        setResult(null)

        try {
            const commandResult = await executeCommand(parsed.command)

            setResult({
                status: commandResult.success ? 'success' : 'error',
                message: commandResult.message,
                errorCode: commandResult.errorCode,
                autoDismissMs: commandResult.success ? 3500 : null,
            })

            if (commandResult.success) {
                setInput('')
                onCommandComplete?.()
            }
        } catch (error) {
            setResult({
                status: 'error',
                message: error instanceof Error ? error.message : '명령 실행 중 오류 발생',
                autoDismissMs: null,
            })
        } finally {
            setExecuting(false)
        }
    }, [onCommandComplete])

    const handleSubmit = async () => {
        if (executing || !input.trim()) return

        const isSingleTokenSlash = input.trim().startsWith('/') && !input.trim().includes(' ')
        if (isSingleTokenSlash && filteredSuggestions.length > 0 && showSuggestions) {
            const picked = filteredSuggestions[Math.max(0, Math.min(activeIndex, filteredSuggestions.length - 1))]
            setInput(`${picked.command} `)
            setShowSuggestions(false)
            return
        }

        await executeInput(input.trim())
        setShowSuggestions(false)
    }

    const handlePickSuggestion = (suggestion: CommandSuggestion) => {
        setInput(`${suggestion.command} `)
        setShowSuggestions(false)
    }

    const handleFocusQuick = async () => {
        if (executing || activeSession) return

        setExecuting(true)
        setResult(null)
        try {
            const candidates = await getWorkItems({ status: 'candidate' })
            const target = candidates.find((item) => item.next_action)

            if (!target) {
                setResult({
                    status: 'error',
                    message: 'Focus 가능한 candidate가 없습니다. next_action을 먼저 설정하세요.',
                    autoDismissMs: null,
                })
                return
            }

            await executeInput(`/focus ${target.id}`)
        } finally {
            setExecuting(false)
        }
    }

    const handleCloseQuick = () => {
        if (!activeSession) {
            setResult({
                status: 'error',
                message: '현재 활성 세션이 없습니다.',
                autoDismissMs: null,
            })
            return
        }
        setCloseDialogOpen(true)
    }

    const confirmCloseQuick = async () => {
        if (!activeSession) {
            setCloseDialogOpen(false)
            return
        }

        if (!doneLog.trim()) {
            setResult({
                status: 'error',
                message: 'done_log를 입력해야 Close할 수 있습니다.',
                autoDismissMs: null,
            })
            return
        }

        await executeInput(`/close ${activeSession.work_item_id} ${doneLog.trim()}`)
        setDoneLog('')
        setCloseDialogOpen(false)
    }

    return (
        <div className="command-toolbar" role="region" aria-label="명령 실행 도구">
            <div className="command-toolbar__center">
                <CommandBar
                    value={input}
                    disabled={executing}
                    onChange={(value) => {
                        setInput(value)
                        setShowSuggestions(value.startsWith('/'))
                        setActiveIndex(0)
                    }}
                    onSubmit={handleSubmit}
                    onFocus={() => setShowSuggestions(input.startsWith('/'))}
                    onBlur={() => {
                        // 클릭 선택 허용을 위해 약간 지연 후 닫기
                        window.setTimeout(() => setShowSuggestions(false), 120)
                    }}
                    onKeyDown={(event) => {
                        if (!showSuggestions || filteredSuggestions.length === 0) return

                        if (event.key === 'ArrowDown') {
                            event.preventDefault()
                            setActiveIndex((prev) => (prev + 1) % filteredSuggestions.length)
                        }

                        if (event.key === 'ArrowUp') {
                            event.preventDefault()
                            setActiveIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length)
                        }

                        if (event.key === 'Escape') {
                            setShowSuggestions(false)
                        }
                    }}
                />

                <SuggestionPanel
                    suggestions={filteredSuggestions}
                    activeIndex={activeIndex}
                    visible={showSuggestions}
                    onSelect={handlePickSuggestion}
                />
            </div>

            <div className="command-toolbar__actions" aria-label="GUI 명령 액션">
                <button type="button" onClick={() => void executeInput('/plan 180')} disabled={executing}>
                    Plan
                </button>
                <button type="button" onClick={() => void handleFocusQuick()} disabled={executing || !!activeSession}>
                    Focus
                </button>
                <button type="button" onClick={handleCloseQuick} disabled={executing || !activeSession}>
                    Close
                </button>
                <button type="button" onClick={() => void executeInput('/review daily')} disabled={executing}>
                    Review
                </button>
                <button type="button" onClick={() => void executeInput('/reschedule 긴급 일정 반영')} disabled={executing}>
                    Reschedule
                </button>
            </div>

            <CommandResult result={result} onClose={() => setResult(null)} />

            <ConfirmDialog
                isOpen={closeDialogOpen}
                title="작업 종료 확인"
                message="done_log를 입력하면 현재 활성 세션을 종료합니다."
                confirmLabel="Close 실행"
                cancelLabel="취소"
                confirmDisabled={!doneLog.trim()}
                onCancel={() => setCloseDialogOpen(false)}
                onConfirm={() => void confirmCloseQuick()}
                isDangerous
            >
                <label className="command-toolbar__dialog-label" htmlFor="quick-close-log">완료 로그</label>
                <input
                    id="quick-close-log"
                    type="text"
                    className="command-toolbar__dialog-input"
                    value={doneLog}
                    onChange={(event) => setDoneLog(event.target.value)}
                    placeholder="예: 충돌 감지 로직 연결 및 테스트 완료"
                />
            </ConfirmDialog>
        </div>
    )
}
