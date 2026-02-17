// ============================================
// commandExecutor.ts — 유일한 오케스트레이터 (Contract C2)
// parse → validate → stateMachine → persistence → event → result
// 모든 DB write와 event 발행은 여기서만 수행
// ============================================

import type { Command, CommandResult, ErrorCode } from '../../types/index'
import { validateTransition, ERROR_MESSAGES, type TransitionContext } from './stateMachine'

// Persistence
import { createWorkItem, updateWorkItem, getWorkItemById } from '../../lib/supabase/workItems'
import { startSession, endSession, getActiveSession } from '../../lib/supabase/sessionLogs'
import { logEvent } from '../../lib/supabase/eventLogs'

// Scheduler
import { calculateSlots } from '../../features/scheduler/slotCalculator'
import { getWorkItems } from '../../lib/supabase/workItems'
import { getFixedEvents } from '../../lib/supabase/fixedEvents'
import { getProjectDeadlines } from '../../lib/supabase/projectDeadlines'

// Event Pipeline
import { processEvent } from '../../lib/events/pipeline'
import { EVENT_TYPES } from '../../lib/events/eventTypes'

// === 에러 결과 헬퍼 ===

function errorResult(errorCode: ErrorCode, message?: string): CommandResult {
    return {
        success: false,
        message: message ?? ERROR_MESSAGES[errorCode],
        errorCode,
    }
}

function successResult(message: string, data?: unknown): CommandResult {
    return { success: true, message, data }
}

// === 명령별 실행 로직 ===

/** /capture [text] — backlog에 작업 추가 */
async function executeCapture(command: Command): Promise<CommandResult> {
    const text = command.args.join(' ')
    if (!text) return errorResult('INVALID_COMMAND_ARGS', '캡처할 텍스트를 입력하세요.')

    const item = await createWorkItem({ title: text, status: 'backlog' })

    await processEvent({
        event_id: crypto.randomUUID(),
        command_id: command.id,
        event_type: EVENT_TYPES.TASK_STATUS_CHANGE,
        payload: { action: 'capture', work_item_id: item.id, title: text },
        actor: 'user',
    })

    return successResult(`작업 캡처 완료: "${text}"`, item)
}

/** /clarify [task_id] [next_action] — 작업 구조화 */
async function executeClarify(command: Command): Promise<CommandResult> {
    const [taskId, ...rest] = command.args
    if (!taskId) return errorResult('INVALID_COMMAND_ARGS', 'task_id를 입력하세요.')

    const nextAction = rest.join(' ') || null
    const updates: Record<string, unknown> = {}
    if (nextAction) updates.next_action = nextAction

    const updated = await updateWorkItem(taskId, updates)

    // DoD는 event_logs.payload에 저장 (Contract C5)
    await logEvent(
        EVENT_TYPES.TASK_STATUS_CHANGE,
        {
            action: 'clarify',
            work_item_id: taskId,
            next_action: nextAction,
            command_id: command.id,
        },
        'user',
    )

    return successResult(`작업 구조화 완료: ${taskId}`, updated)
}

/** /plan [available_time] — 일정 편성 (제안만, 자동 반영 X) */
async function executePlan(command: Command): Promise<CommandResult> {
    const availableTime = parseInt(command.args[0] ?? '', 10)
    if (isNaN(availableTime) || availableTime <= 0) {
        return errorResult('INVALID_COMMAND_ARGS', '가용 시간(분)을 입력하세요. 예: /plan 180')
    }

    const [candidates, fixedEvents, deadlines] = await Promise.all([
        getWorkItems({ status: 'candidate' }),
        getFixedEvents(),
        getProjectDeadlines(),
    ])

    const plan = calculateSlots({
        available_minutes: availableTime,
        fixed_events: fixedEvents,
        candidates,
        deadlines,
    })

    await processEvent({
        event_id: crypto.randomUUID(),
        command_id: command.id,
        event_type: EVENT_TYPES.SCHEDULE_NEW,
        payload: { action: 'plan', plan, available_time: availableTime },
        actor: 'system',
    })

    return successResult(
        `일정 편성 제안: ${plan.slots.length}개 슬롯 (${plan.used_minutes}/${availableTime}분 사용)`,
        plan,
    )
}

/** /focus [task_id] — 작업 시작 */
async function executeFocus(command: Command): Promise<CommandResult> {
    const taskId = command.args[0]
    if (!taskId) return errorResult('INVALID_COMMAND_ARGS', 'task_id를 입력하세요.')

    // 중복 세션 체크
    const activeSession = await getActiveSession()
    if (activeSession) return errorResult('ACTIVE_SESSION_EXISTS')

    // 현재 상태 조회
    const item = await getWorkItemById(taskId)

    // 상태 전이 검증 (순수 함수)
    const context: TransitionContext = { next_action: item.next_action }
    const validation = validateTransition(item.status, 'active', context)

    if (!validation.ok) {
        return errorResult(validation.errorCode!)
    }

    // Persistence: 상태 변경 + 세션 생성
    await updateWorkItem(taskId, { status: 'active' })
    const session = await startSession(taskId)

    // Event
    await processEvent({
        event_id: crypto.randomUUID(),
        command_id: command.id,
        event_type: EVENT_TYPES.TASK_STATUS_CHANGE,
        payload: {
            action: 'focus',
            work_item_id: taskId,
            session_id: session.id,
            from: item.status,
            to: 'active',
        },
        actor: 'user',
    })

    return successResult(`작업 시작: "${item.title}"`, { item, session })
}

/** /close [task_id] [done_log] — 작업 종료 */
async function executeClose(command: Command): Promise<CommandResult> {
    const [taskId, ...logParts] = command.args
    if (!taskId) return errorResult('INVALID_COMMAND_ARGS', 'task_id를 입력하세요.')

    const doneLog = logParts.join(' ') || null

    // 현재 상태 조회
    const item = await getWorkItemById(taskId)

    // 상태 전이 검증
    const context: TransitionContext = { done_log: doneLog }
    const validation = validateTransition(item.status, 'done', context)

    if (!validation.ok) {
        return errorResult(validation.errorCode!)
    }

    // 활성 세션 종료
    const activeSession = await getActiveSession()
    if (!activeSession) return errorResult('NO_ACTIVE_SESSION')

    await endSession(activeSession.id, { result: 'done', done_log: doneLog })

    // 상태 변경
    await updateWorkItem(taskId, { status: 'done' })

    // Event
    await processEvent({
        event_id: crypto.randomUUID(),
        command_id: command.id,
        event_type: EVENT_TYPES.TASK_STATUS_CHANGE,
        payload: {
            action: 'close',
            work_item_id: taskId,
            done_log: doneLog,
            from: item.status,
            to: 'done',
        },
        actor: 'user',
    })

    return successResult(`작업 완료: "${item.title}"`, { item, done_log: doneLog })
}

/** /review [daily|weekly|monthly] — 회고 리포트 */
async function executeReview(command: Command): Promise<CommandResult> {
    const period = command.args[0] as 'daily' | 'weekly' | 'monthly' | undefined
    if (!period || !['daily', 'weekly', 'monthly'].includes(period)) {
        return errorResult('INVALID_COMMAND_ARGS', '기간을 입력하세요: daily, weekly, monthly')
    }

    await processEvent({
        event_id: crypto.randomUUID(),
        command_id: command.id,
        event_type: EVENT_TYPES.REVIEW_DAILY,
        payload: { action: 'review', period },
        actor: 'user',
    })

    // Phase 1: 단순 메시지 반환. Phase 2에서 LLM 연동 리포트 생성
    return successResult(`${period} 리뷰가 요청되었습니다. (리포트 생성은 Phase 2에서 구현)`)
}

/** /reschedule [reason] — 일정 재배치 (제안만) */
async function executeReschedule(command: Command): Promise<CommandResult> {
    const reason = command.args.join(' ')
    if (!reason) return errorResult('INVALID_COMMAND_ARGS', '재배치 사유를 입력하세요.')

    await processEvent({
        event_id: crypto.randomUUID(),
        command_id: command.id,
        event_type: EVENT_TYPES.SCHEDULE_URGENT,
        payload: { action: 'reschedule', reason },
        actor: 'user',
    })

    // Phase 1: 제안만 생성. 자동 반영 X
    return successResult(`일정 재배치 제안이 생성되었습니다. 사유: "${reason}"`)
}

// === 메인 실행기 (Contract C2) ===

const COMMAND_HANDLERS: Record<string, (cmd: Command) => Promise<CommandResult>> = {
    capture: executeCapture,
    clarify: executeClarify,
    plan: executePlan,
    focus: executeFocus,
    close: executeClose,
    review: executeReview,
    reschedule: executeReschedule,
}

export async function executeCommand(command: Command): Promise<CommandResult> {
    const handler = COMMAND_HANDLERS[command.type]
    if (!handler) {
        return errorResult('INVALID_COMMAND_ARGS', `핸들러 없음: ${command.type}`)
    }

    try {
        return await handler(command)
    } catch (err) {
        return {
            success: false,
            message: err instanceof Error ? err.message : '명령 실행 중 오류 발생',
        }
    }
}
