// ============================================
// commands/session.ts — orchx session start/end
// Focus Session 시작/종료
// ============================================

import { Command } from 'commander'
import chalk from 'chalk'
import { createSession, readSession, deleteSession } from '../config/session.js'

const AGENT_TYPES = ['cursor', 'claude_code', 'codex', 'windsurf', 'copilot', 'antigravity', 'custom']

export function sessionCommand(): Command {
    const cmd = new Command('session')
        .description('Manage focus sessions')

    cmd.command('start')
        .description('Start a new focus session')
        .requiredOption('-a, --agent <type>', `Agent type (${AGENT_TYPES.join(', ')})`)
        .requiredOption('-t, --task <description>', 'Task description')
        .action((opts: { agent: string; task: string }) => {
            const cwd = process.cwd()

            // 이미 활성 세션 확인
            const existing = readSession(cwd)
            if (existing) {
                console.error(chalk.red('✗ Active session already exists:'))
                console.error(chalk.dim(`  Agent: ${existing.agent_type}`))
                console.error(chalk.dim(`  Task: ${existing.task_name}`))
                console.error(chalk.dim(`  Started: ${existing.started_at}`))
                console.error('')
                console.error(chalk.yellow('Run "orchx session end" first.'))
                process.exit(1)
            }

            // 에이전트 타입 검증
            if (!AGENT_TYPES.includes(opts.agent)) {
                console.error(chalk.red(`✗ Unknown agent type: ${opts.agent}`))
                console.error(chalk.dim(`  Valid: ${AGENT_TYPES.join(', ')}`))
                process.exit(1)
            }

            const session = createSession(cwd, opts.agent, opts.task)

            console.log(chalk.green('✓'), 'Focus session started')
            console.log('')
            console.log(chalk.bold(`  🤖 Agent:   ${session.agent_type}`))
            console.log(chalk.bold(`  📋 Task:    ${session.task_name}`))
            console.log(chalk.bold(`  🕐 Started: ${new Date(session.started_at).toLocaleTimeString()}`))
            console.log(chalk.dim(`  📝 Session: ${session.session_id}`))
            console.log('')
            console.log(chalk.dim('All commits will now include Agent/Session/Task metadata.'))
            console.log(chalk.dim('Run "orchx session end" when done.'))
        })

    cmd.command('end')
        .description('End the current focus session')
        .option('-r, --result <outcome>', 'Result: success|failure|partial|timeout', 'success')
        .option('-n, --note <text>', 'Session note')
        .action((opts: { result: string; note?: string }) => {
            const cwd = process.cwd()
            const session = readSession(cwd)

            if (!session) {
                console.error(chalk.red('✗ No active session found.'))
                process.exit(1)
            }

            const duration = Date.now() - new Date(session.started_at).getTime()
            const durationMin = Math.round(duration / 60000)

            deleteSession(cwd)

            console.log(chalk.green('✓'), 'Focus session ended')
            console.log('')
            console.log(chalk.bold(`  🤖 Agent:    ${session.agent_type}`))
            console.log(chalk.bold(`  📋 Task:     ${session.task_name}`))
            console.log(chalk.bold(`  ⏱  Duration: ${durationMin}m`))
            console.log(chalk.bold(`  📊 Result:   ${opts.result}`))
            console.log(chalk.bold(`  📁 Files:    ${session.files_changed} changed`))
            console.log(chalk.bold(`  🔄 Commits:  ${session.commits_detected} detected`))
            if (opts.note) {
                console.log(chalk.bold(`  📝 Note:     ${opts.note}`))
            }
        })

    cmd.command('status')
        .description('Show current session status')
        .action(() => {
            const cwd = process.cwd()
            const session = readSession(cwd)

            if (!session) {
                console.log(chalk.dim('No active session.'))
                return
            }

            const duration = Date.now() - new Date(session.started_at).getTime()
            const durationMin = Math.round(duration / 60000)

            console.log(chalk.bold('Active Session:'))
            console.log(`  🤖 Agent:    ${session.agent_type}`)
            console.log(`  📋 Task:     ${session.task_name}`)
            console.log(`  ⏱  Duration: ${durationMin}m`)
            console.log(`  📁 Files:    ${session.files_changed} changed`)
            console.log(`  🔄 Commits:  ${session.commits_detected} detected`)
        })

    return cmd
}
