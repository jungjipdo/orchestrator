// ============================================
// commandParser.ts — 명령 파싱 + command_id 생성
// "/command [args]" → Command 객체
// ============================================

import type { Command, CommandType } from '../../types/index'

const VALID_COMMANDS: Set<CommandType> = new Set([
    'capture', 'clarify', 'plan', 'focus', 'close', 'review', 'reschedule',
])

// === UUID 생성 (crypto.randomUUID fallback) ===

function generateCommandId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

// === 파싱 ===

interface ParseSuccess {
    success: true
    command: Command
}

interface ParseFailure {
    success: false
    error: string
}

export type ParseResult = ParseSuccess | ParseFailure

export function parseCommand(raw: string): ParseResult {
    const trimmed = raw.trim()

    // "/" 필수
    if (!trimmed.startsWith('/')) {
        return {
            success: false,
            error: `명령은 /로 시작해야 합니다: "${trimmed}"`,
        }
    }

    const parts = trimmed.slice(1).split(/\s+/)
    const commandName = parts[0]?.toLowerCase()

    if (!commandName) {
        return {
            success: false,
            error: '명령이 비어있습니다.',
        }
    }

    if (!VALID_COMMANDS.has(commandName as CommandType)) {
        return {
            success: false,
            error: `알 수 없는 명령: /${commandName}. 사용 가능: ${[...VALID_COMMANDS].map(c => `/${c}`).join(', ')}`,
        }
    }

    const args = parts.slice(1)

    return {
        success: true,
        command: {
            id: generateCommandId(),
            type: commandName as CommandType,
            args,
            raw: trimmed,
        },
    }
}
