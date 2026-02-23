// ============================================
// config/contractEnforcer.ts — 계약 집행 레이어
// 실행 계약서(allowed_paths/commands) 위반 탐지
// ============================================

// === 타입 ===

export interface ExecutionContract {
    allowed_paths: string[]
    allowed_commands: string[]
}

export interface ViolationResult {
    violation: true
    type: 'path' | 'command'
    target: string
    reason: string
}

// === ContractEnforcer ===

export class ContractEnforcer {
    private contract: ExecutionContract

    constructor(contract: ExecutionContract) {
        this.contract = contract
    }

    /** 변경된 파일 경로가 계약서 허용 범위 내인지 확인 */
    checkPath(changedPath: string): ViolationResult | null {
        // 계약서에 허용 경로가 비어있으면 제한 없음 (계약서 미설정 상태)
        if (this.contract.allowed_paths.length === 0) return null

        const isAllowed = this.contract.allowed_paths.some(pattern =>
            this.matchGlob(changedPath, pattern)
        )

        if (isAllowed) return null

        return {
            violation: true,
            type: 'path',
            target: changedPath,
            reason: `허용 경로 밖의 파일 변경: ${changedPath}`,
        }
    }

    /** 실행하려는 명령이 계약서 화이트리스트에 있는지 확인 */
    checkCommand(cmd: string): ViolationResult | null {
        // 허용 명령이 비어있으면 제한 없음
        if (this.contract.allowed_commands.length === 0) return null

        // 쉘 연산자 차단 (명령 체이닝/리다이렉트 우회 방지)
        const dangerousPatterns = /[;&|`$><]|\|\||\&\&/
        if (dangerousPatterns.test(cmd)) {
            return {
                violation: true,
                type: 'command',
                target: cmd,
                reason: `위험한 쉘 연산자가 포함된 명령: ${cmd}`,
            }
        }

        const baseCmd = cmd.trim()
        const isAllowed = this.contract.allowed_commands.some(allowed =>
            baseCmd === allowed || baseCmd === allowed.trim()
        )

        if (isAllowed) return null

        return {
            violation: true,
            type: 'command',
            target: cmd,
            reason: `허용되지 않은 명령: ${cmd}`,
        }
    }

    /** 계약서 설정 여부 */
    hasContract(): boolean {
        return this.contract.allowed_paths.length > 0 || this.contract.allowed_commands.length > 0
    }

    // --- glob 매칭 ---

    private matchGlob(path: string, pattern: string): boolean {
        const regex = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '{{DOUBLE}}')
            .replace(/\*/g, '[^/]*')
            .replace(/\{\{DOUBLE\}\}/g, '.*')
        return new RegExp(`^${regex}$`).test(path) || new RegExp(`${regex}$`).test(path)
    }
}
