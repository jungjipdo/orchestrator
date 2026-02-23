// ============================================
// commands/inject.ts — orchx inject
// 서버 Task → 로컬 CURRENT_TASK.md 프롬프트 생성
// ============================================

import { Command } from 'commander'
import chalk from 'chalk'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readSession, ensureOrchestratorDir } from '../config/session.js'
import { SyncClient } from './sync.js'

// === CURRENT_TASK.md 템플릿 생성 ===

interface TaskInfo {
    instruction: string
    risk_tier: string
    allowed_paths: string[]
    allowed_commands: string[]
}

function generateTaskMarkdown(task: TaskInfo): string {
    const riskEmoji = task.risk_tier === 'high' ? '🔴'
        : task.risk_tier === 'mid' ? '🟡'
            : '🟢'

    const riskLabel = task.risk_tier === 'high' ? '높음(High)'
        : task.risk_tier === 'mid' ? '보통(Mid)'
            : '낮음(Low)'

    const pathsList = task.allowed_paths.length > 0
        ? task.allowed_paths.map(p => `- ${p}`).join('\n')
        : '- 제한 없음'

    const cmdsList = task.allowed_commands.length > 0
        ? task.allowed_commands.map(c => `- \`${c}\``).join('\n')
        : '- 제한 없음'

    return `# 🔒 실행 계약서

> 이 파일은 orchx에 의해 자동 생성되었습니다. 수동으로 수정하지 마세요.

## 위험 등급: ${riskEmoji} ${riskLabel}

## 허용 경로
${pathsList}

## 허용 명령
${cmdsList}

---

# 📋 작업 지시

${task.instruction}

---

> ⚠️ 위 계약서 범위를 벗어나는 파일 수정이나 명령 실행은 경고가 발생합니다.
`
}

// === injectCommand ===

export function injectCommand(): Command {
    const cmd = new Command('inject')
        .description('서버 Task를 로컬 CURRENT_TASK.md로 주입')
        .option('-m, --manual <instruction>', '수동 지시 (서버 연결 없이)')
        .action(async (opts: { manual?: string }) => {
            const cwd = process.cwd()
            const session = readSession(cwd)

            if (!session) {
                console.error(chalk.red('✗ No active session. Run "orchx session start" first.'))
                process.exit(1)
            }

            let taskInfo: TaskInfo

            if (opts.manual) {
                // 수동 모드: 명령줄에서 직접 지시
                taskInfo = {
                    instruction: opts.manual,
                    risk_tier: 'mid',
                    allowed_paths: session.execution_contract?.allowed_paths ?? [],
                    allowed_commands: session.execution_contract?.allowed_commands ?? [],
                }
                console.log(chalk.dim('  수동 모드로 Task 생성'))
            } else {
                // 서버에서 Task 조회
                console.log(chalk.dim('  서버에서 Task 조회 중...'))

                // 환경변수에서 SyncClient 생성
                const url = process.env.ORCHX_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
                const key = process.env.ORCHX_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

                if (!url || !key) {
                    console.error(chalk.red('✗ Supabase 환경변수가 설정되지 않았습니다.'))
                    console.error(chalk.dim('  수동 모드 사용: orchx inject --manual "작업 내용"'))
                    process.exit(1)
                }

                const client = new SyncClient(url, key, cwd)
                const serverTask = await client.fetchTask(session.session_id)

                if (!serverTask) {
                    console.log(chalk.yellow('⚠'), '할당된 Task가 없습니다.')
                    console.log(chalk.dim('  수동 모드 사용: orchx inject --manual "작업 내용"'))
                    return
                }

                taskInfo = {
                    instruction: (serverTask.instruction as string) ?? '지시 없음',
                    risk_tier: (serverTask.risk_tier as string) ?? 'mid',
                    allowed_paths: (serverTask.allowed_paths as string[]) ?? [],
                    allowed_commands: (serverTask.allowed_commands as string[]) ?? [],
                }
            }

            // CURRENT_TASK.md 생성
            ensureOrchestratorDir(cwd)
            const taskPath = join(cwd, '.orchestrator', 'CURRENT_TASK.md')
            const content = generateTaskMarkdown(taskInfo)
            writeFileSync(taskPath, content, 'utf-8')

            console.log(chalk.green('✓'), `Task 주입 완료: ${taskPath}`)
            console.log(chalk.dim(`  위험 등급: ${taskInfo.risk_tier}`))
            console.log(chalk.dim(`  허용 경로: ${taskInfo.allowed_paths.length > 0 ? taskInfo.allowed_paths.join(', ') : '제한 없음'}`))
        })

    return cmd
}
