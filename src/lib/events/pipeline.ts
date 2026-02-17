// ============================================
// pipeline.ts — 이벤트 파이프라인
// trigger → classify → propose → confirm → apply → log
// 관측성: event_id, command_id, stage, status 기록
// ============================================

import type { EventStage } from '../../types/index'
import { logEvent } from '../supabase/eventLogs'
import { EVENT_META, type EventType } from './eventTypes'

// === 파이프라인 이벤트 ===

export interface PipelineEvent {
    event_id: string
    command_id: string | null
    event_type: EventType
    payload: Record<string, unknown>
    actor: 'user' | 'system' | 'ai'
}

// === 파이프라인 결과 ===

export interface PipelineResult {
    event_id: string
    finalStage: EventStage
    applied: boolean
    error?: string
}

// === Stage 로그 ===

interface StageLog {
    event_id: string
    command_id: string | null
    stage: EventStage
    status: 'success' | 'failed' | 'skipped'
    timestamp: string
}

const stageHistory: StageLog[] = []

function recordStage(
    event_id: string,
    command_id: string | null,
    stage: EventStage,
    status: 'success' | 'failed' | 'skipped',
) {
    stageHistory.push({
        event_id,
        command_id,
        stage,
        status,
        timestamp: new Date().toISOString(),
    })
}

/** 관측용: stage 히스토리 조회 */
export function getStageHistory(): readonly StageLog[] {
    return stageHistory
}

/** 히스토리 초기화 (테스트용) */
export function clearStageHistory(): void {
    stageHistory.length = 0
}

// === 메인 파이프라인 ===

export async function processEvent(event: PipelineEvent): Promise<PipelineResult> {
    const { event_id, command_id, event_type, payload, actor } = event
    const meta = EVENT_META[event_type]

    try {
        // 1. Triggered
        recordStage(event_id, command_id, 'triggered', 'success')

        // 2. Classified
        recordStage(event_id, command_id, 'classified', 'success')

        // 3. Proposed (autoApply가 아닌 경우 제안만 생성)
        if (!meta.autoApply) {
            recordStage(event_id, command_id, 'proposed', 'success')

            // DB에 이벤트 기록 (applied_at 없이)
            await logEvent(
                event_type,
                {
                    ...payload,
                    _pipeline: { event_id, command_id, stage: 'proposed' },
                },
                actor,
            )

            return {
                event_id,
                finalStage: 'proposed',
                applied: false,
            }
        }

        // 4. Confirmed (autoApply → 자동 확인)
        recordStage(event_id, command_id, 'confirmed', 'success')

        // 5. Applied
        await logEvent(
            event_type,
            {
                ...payload,
                _pipeline: { event_id, command_id, stage: 'applied' },
            },
            actor,
        )
        recordStage(event_id, command_id, 'applied', 'success')

        // 6. Logged
        recordStage(event_id, command_id, 'logged', 'success')

        return {
            event_id,
            finalStage: 'logged',
            applied: true,
        }
    } catch (err) {
        // 실패 시 failed stage 로그
        const stage = stageHistory
            .filter(s => s.event_id === event_id)
            .pop()?.stage ?? 'triggered'

        recordStage(event_id, command_id, stage, 'failed')

        return {
            event_id,
            finalStage: stage,
            applied: false,
            error: err instanceof Error ? err.message : 'Pipeline error',
        }
    }
}

// === 제안된 이벤트 확인 + 적용 (proposed → confirm → apply → log) ===

/**
 * autoApply=false로 proposed 상태에서 멈춘 이벤트를
 * 사용자 확인 후 나머지 단계(confirm → apply → log)로 완주시킴.
 *
 * processEvent()가 { applied: false, finalStage: 'proposed' }를 반환한 경우에만 사용.
 */
export async function confirmAndApplyEvent(
    event: PipelineEvent,
): Promise<PipelineResult> {
    const { event_id, command_id, event_type, payload, actor } = event

    try {
        // 4. Confirmed (사용자가 승인)
        recordStage(event_id, command_id, 'confirmed', 'success')

        // 5. Applied
        await logEvent(
            event_type,
            {
                ...payload,
                _pipeline: { event_id, command_id, stage: 'applied' },
            },
            actor,
        )
        recordStage(event_id, command_id, 'applied', 'success')

        // 6. Logged
        recordStage(event_id, command_id, 'logged', 'success')

        return {
            event_id,
            finalStage: 'logged',
            applied: true,
        }
    } catch (err) {
        const stage = stageHistory
            .filter(s => s.event_id === event_id)
            .pop()?.stage ?? 'confirmed'

        recordStage(event_id, command_id, stage, 'failed')

        return {
            event_id,
            finalStage: stage,
            applied: false,
            error: err instanceof Error ? err.message : 'Pipeline error',
        }
    }
}
