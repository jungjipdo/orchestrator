// ==========================================
// commands/watch.ts — orchx watch
// chokidar 기반 파일 변경 감지 + 계약 집행 + 서버 전송
// ==========================================

import { Command } from 'commander'
import chalk from 'chalk'
import { readSession, updateSessionStats } from '../config/session.js'
import { ContractEnforcer } from '../config/contractEnforcer.js'
import { SyncClient } from './sync.js'
import { runTests } from './tester.js'

// === 디바운스 유틸 ===

function createDebounce(
    delay: number,
    onFlush: (files: string[]) => void,
) {
    let timer: ReturnType<typeof setTimeout> | null = null
    const pending: string[] = []

    return {
        add(path: string) {
            pending.push(path)
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                const files = [...new Set(pending)]
                pending.length = 0
                timer = null
                if (files.length > 0) {
                    onFlush(files)
                }
            }, delay)
        },
    }
}

// === SyncClient 생성 (환경변수 기반) ===

async function tryCreateSyncClient(projectPath: string): Promise<SyncClient | null> {
    // sync.ts의 loadEnv 로직을 재사용하기 위해 동적 import 방식 대신
    // 환경변수/파일에서 직접 로드
    try {
        const { readFileSync, existsSync } = await import('node:fs')
        const { join } = await import('node:path')

        const searchPaths = [
            join(projectPath, '.env.local'),
            join(projectPath, '.env'),
        ]

        for (const envPath of searchPaths) {
            if (!existsSync(envPath)) continue
            const content = readFileSync(envPath, 'utf-8')
            const vars: Record<string, string> = {}
            for (const line of content.split('\n')) {
                const match = line.match(/^([A-Z_]+)=["']?(.+?)["']?\s*$/)
                if (match) vars[match[1]] = match[2]
            }
            const url = vars.ORCHX_SUPABASE_URL ?? vars.VITE_SUPABASE_URL
            const key = vars.ORCHX_SUPABASE_ANON_KEY ?? vars.VITE_SUPABASE_ANON_KEY
            if (url && key) return new SyncClient(url, key, projectPath)
        }
    } catch { /* 환경변수 없으면 sync 비활성화 */ }

    return null
}

export function watchCommand(): Command {
    const cmd = new Command('watch')
        .description('Watch for file changes with contract enforcement')
        .action(async () => {
            const cwd = process.cwd()
            const session = readSession(cwd)

            if (!session) {
                console.error(chalk.red('✗ No active session. Run "orchx session start" first.'))
                process.exit(1)
            }

            // 계약 집행기 초기화
            const enforcer = new ContractEnforcer(
                session.execution_contract ?? { allowed_paths: [], allowed_commands: [] }
            )

            // 서버 전송 클라이언트 (없으면 로컬 모드)
            const syncClient = await tryCreateSyncClient(cwd)

            // 프로젝트 ID 자동 매칭
            if (syncClient) {
                await syncClient.resolveProjectId()
            }

            console.log(chalk.green('👁'), `Watching ${cwd}`)
            console.log(chalk.dim(`  Agent: ${session.agent_type} | Task: ${session.task_name}`))
            if (enforcer.hasContract()) {
                console.log(chalk.cyan('  🔒 계약 집행 활성화'))
            } else {
                console.log(chalk.dim('  📝 계약서 미설정 (제한 없음)'))
            }
            if (syncClient) {
                console.log(chalk.dim('  📡 서버 전송 활성화'))
            }
            console.log(chalk.dim('  Press Ctrl+C to stop'))
            console.log('')

            const chokidar = await import('chokidar')
            const debounce = createDebounce(2000, (files) => {
                console.log(chalk.dim(`  📦 디바운스 완료: ${files.length}개 파일 → 테스트 실행`))
                void (async () => {
                    const report = await runTests(files, cwd, enforcer)
                    if (syncClient && (report.passed > 0 || report.failed > 0)) {
                        await syncClient.sendEvent('test.completed', {
                            ...report,
                        }).catch(() => { /* 전송 실패 무시 */ })
                    }
                })()
            })

            let filesChanged = session.files_changed
            let commitsDetected = session.commits_detected
            let violationCount = 0

            // === 파일 변경 핸들러 ===

            async function handleFileChange(path: string, eventType: 'change' | 'add' | 'unlink') {
                const relative = path.replace(cwd + '/', '')

                // Safety: ignored에서 빠져나온 경우 이중 체크
                if (/^\.(orchestrator|git)\/|node_modules|dist\/|build\/|\.next\//.test(relative)) return

                filesChanged++

                // 이모지 선택
                const icon = eventType === 'add' ? chalk.green('  +')
                    : eventType === 'unlink' ? chalk.red('  -')
                        : chalk.blue('  ✎')

                console.log(icon, chalk.dim(relative))
                updateSessionStats(cwd, { files_changed: filesChanged })

                // 1) 계약 위반 체크
                const violation = enforcer.checkPath(relative)
                if (violation) {
                    violationCount++
                    console.log(chalk.red('  🚨 계약 위반!'), chalk.yellow(violation.reason))

                    // 서버에 위반 보고
                    if (syncClient) {
                        await syncClient.sendEvent('contract.violation', {
                            path: relative,
                            type: eventType,
                            reason: violation.reason,
                        }).catch(() => { /* 전송 실패 무시 */ })
                    }
                }

                // 2) 서버에 변경 이벤트 전송
                if (syncClient && !violation) {
                    await syncClient.sendEvent('file.changed', {
                        path: relative,
                        type: eventType,
                    }).catch(() => { /* 전송 실패 무시 */ })
                }

                // 3) 디바운스에 추가 (tester 연동 준비)
                if (eventType !== 'unlink') {
                    debounce.add(relative)
                }
            }

            const IGNORED_DIRS = ['node_modules', '.git', '.orchestrator', 'dist', 'build', '.next']

            const watcher = chokidar.watch(cwd, {
                ignored: (filePath: string) => {
                    const rel = filePath.replace(cwd, '').replace(/^\//, '')
                    return IGNORED_DIRS.some(d => rel === d || rel.startsWith(d + '/'))
                },
                ignoreInitial: true,
                persistent: true,
            })

            watcher.on('change', (path: string) => { void handleFileChange(path, 'change') })
            watcher.on('add', (path: string) => { void handleFileChange(path, 'add') })
            watcher.on('unlink', (path: string) => { void handleFileChange(path, 'unlink') })

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
                console.log(chalk.dim(`Session stats: ${filesChanged} files, ${commitsDetected} commits, ${violationCount} violations`))
                watcher.close()
                gitWatcher.close()
                process.exit(0)
            })
        })

    return cmd
}

