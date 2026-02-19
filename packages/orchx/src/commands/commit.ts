// ============================================
// commands/commit.ts — orchx commit
// 메타데이터 포함 커밋 래퍼
// ============================================

import { Command } from 'commander'
import { execSync } from 'node:child_process'
import chalk from 'chalk'
import { readSession } from '../config/session.js'

export function commitCommand(): Command {
    const cmd = new Command('commit')
        .description('Git commit with agent metadata')
        .requiredOption('-m, --message <msg>', 'Commit message')
        .option('--push', 'Push after commit')
        .action((opts: { message: string; push?: boolean }) => {
            const cwd = process.cwd()
            const session = readSession(cwd)

            // git add -A
            try {
                execSync('git add -A', { cwd, stdio: 'inherit' })
            } catch {
                console.error(chalk.red('✗ git add failed'))
                process.exit(1)
            }

            // 메시지에 트레일러 추가
            let message = opts.message
            if (session) {
                message += `\n\nAgent: ${session.agent_type}`
                message += `\nSession: ${session.session_id}`
                message += `\nOrchestrator-Task: ${session.task_name}`
            }

            // git commit
            try {
                execSync(`git commit -m ${JSON.stringify(message)}`, { cwd, stdio: 'inherit' })
                console.log(chalk.green('✓'), 'Committed with metadata')
            } catch {
                console.error(chalk.red('✗ git commit failed'))
                process.exit(1)
            }

            // push
            if (opts.push) {
                try {
                    execSync('git push', { cwd, stdio: 'inherit' })
                    console.log(chalk.green('✓'), 'Pushed')
                } catch {
                    console.error(chalk.yellow('⚠'), 'Push failed (commit succeeded)')
                }
            }
        })

    return cmd
}
