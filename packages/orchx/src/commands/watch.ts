// ============================================
// commands/watch.ts — orchx watch
// chokidar 기반 파일 변경 감지 데몬
// ============================================

import { Command } from 'commander'
import chalk from 'chalk'
import { readSession, updateSessionStats } from '../config/session.js'

export function watchCommand(): Command {
    const cmd = new Command('watch')
        .description('Watch for file changes in current project')
        .action(async () => {
            const cwd = process.cwd()
            const session = readSession(cwd)

            if (!session) {
                console.error(chalk.red('✗ No active session. Run "orchx session start" first.'))
                process.exit(1)
            }

            console.log(chalk.green('👁'), `Watching ${cwd}`)
            console.log(chalk.dim(`  Agent: ${session.agent_type} | Task: ${session.task_name}`))
            console.log(chalk.dim('  Press Ctrl+C to stop'))
            console.log('')

            // 동적 import (chokidar는 무거우므로 필요할 때만)
            const chokidar = await import('chokidar')

            let filesChanged = session.files_changed
            let commitsDetected = session.commits_detected

            const watcher = chokidar.watch(cwd, {
                ignored: [
                    '**/node_modules/**',
                    '**/.git/**',
                    '**/.orchestrator/**',
                    '**/dist/**',
                    '**/build/**',
                    '**/.next/**',
                ],
                ignoreInitial: true,
                persistent: true,
            })

            watcher.on('change', (path: string) => {
                filesChanged++
                const relative = path.replace(cwd + '/', '')
                console.log(chalk.blue('  ✎'), chalk.dim(relative))
                updateSessionStats(cwd, { files_changed: filesChanged })
            })

            watcher.on('add', (path: string) => {
                filesChanged++
                const relative = path.replace(cwd + '/', '')
                console.log(chalk.green('  +'), chalk.dim(relative))
                updateSessionStats(cwd, { files_changed: filesChanged })
            })

            watcher.on('unlink', (path: string) => {
                filesChanged++
                const relative = path.replace(cwd + '/', '')
                console.log(chalk.red('  -'), chalk.dim(relative))
                updateSessionStats(cwd, { files_changed: filesChanged })
            })

            // .git/refs 감시로 커밋 감지
            const gitWatcher = chokidar.watch(`${cwd}/.git/refs`, {
                ignoreInitial: true,
                persistent: true,
            })

            gitWatcher.on('change', () => {
                commitsDetected++
                console.log(chalk.yellow('  ⚡'), chalk.bold('commit detected'))
                updateSessionStats(cwd, { commits_detected: commitsDetected })
            })

            // Ctrl+C 종료
            process.on('SIGINT', () => {
                console.log('')
                console.log(chalk.dim(`Session stats: ${filesChanged} files, ${commitsDetected} commits`))
                watcher.close()
                gitWatcher.close()
                process.exit(0)
            })
        })

    return cmd
}
