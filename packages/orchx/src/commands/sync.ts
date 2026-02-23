// ============================================
// commands/sync.ts — orchx sync
// CLI↔서버 통신 모듈 + 내구성(멱등성/재시도)
// ============================================

import { Command } from 'commander'
import chalk from 'chalk'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { readSession, ensureOrchestratorDir } from '../config/session.js'

// === 타입 ===

interface CliEvent {
    event_id: string
    event_type: string
    payload: Record<string, unknown>
    session_id: string | null
    status: 'pending' | 'processed' | 'failed'
    retry_count: number
}

interface FailedEvent {
    event_id: string
    event_type: string
    payload: Record<string, unknown>
    session_id: string | null
    failed_at: string
    retry_count: number
    error: string
}

// === SyncClient ===

export class SyncClient {
    private supabase: SupabaseClient
    private projectPath: string

    constructor(supabaseUrl: string, supabaseKey: string, projectPath: string) {
        this.supabase = createClient(supabaseUrl, supabaseKey)
        this.projectPath = projectPath
    }

    /** 이벤트 전송 (멱등성: event_id UNIQUE 제약) */
    async sendEvent(type: string, payload: Record<string, unknown>): Promise<void> {
        const session = readSession(this.projectPath)
        const eventId = randomUUID()

        const event: Omit<CliEvent, 'status' | 'retry_count'> = {
            event_id: eventId,
            event_type: type,
            payload,
            session_id: session?.session_id ?? null,
        }

        try {
            const { error } = await this.supabase
                .from('cli_events')
                .insert({
                    ...event,
                    status: 'pending',
                    retry_count: 0,
                })

            if (error) {
                // UNIQUE 위반 = 이미 전송됨 (멱등성 보장)
                if (error.code === '23505') {
                    console.log(chalk.yellow('⚠'), `이벤트 ${eventId.slice(0, 8)}... 이미 전송됨 (중복 무시)`)
                    return
                }
                throw error
            }

            console.log(chalk.green('✓'), `이벤트 전송: ${type} (${eventId.slice(0, 8)}...)`)
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            console.error(chalk.red('✗'), `전송 실패: ${errorMsg}`)
            this.saveFailedEvent({ ...event, failed_at: new Date().toISOString(), retry_count: 0, error: errorMsg })
        }
    }

    /** 실패 이벤트 재전송 (최대 3회, exponential backoff) */
    async retryFailed(): Promise<{ retried: number; succeeded: number }> {
        const failed = this.loadFailedEvents()
        if (failed.length === 0) {
            console.log(chalk.dim('재전송할 실패 이벤트 없음'))
            return { retried: 0, succeeded: 0 }
        }

        let succeeded = 0
        const remaining: FailedEvent[] = []

        for (const event of failed) {
            if (event.retry_count >= 3) {
                console.log(chalk.red('✗'), `이벤트 ${event.event_id.slice(0, 8)}... 최대 재시도 초과 → 인간 확인 필요`)
                remaining.push(event)
                continue
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, event.retry_count) * 1000
            await new Promise(resolve => setTimeout(resolve, delay))

            try {
                const { error } = await this.supabase
                    .from('cli_events')
                    .insert({
                        event_id: event.event_id,
                        event_type: event.event_type,
                        payload: event.payload,
                        session_id: event.session_id,
                        status: 'pending',
                        retry_count: event.retry_count + 1,
                    })

                if (error && error.code !== '23505') {
                    throw error
                }

                succeeded++
                console.log(chalk.green('✓'), `재전송 성공: ${event.event_type} (${event.event_id.slice(0, 8)}...)`)
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err)
                console.error(chalk.red('✗'), `재전송 실패: ${errorMsg}`)
                remaining.push({ ...event, retry_count: event.retry_count + 1, error: errorMsg })
            }
        }

        this.writeFailedEvents(remaining)
        return { retried: failed.length, succeeded }
    }

    /** 서버에서 할당된 task 조회 */
    async fetchTask(sessionId: string): Promise<Record<string, unknown> | null> {
        const { data, error } = await this.supabase
            .from('agent_tasks')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error(chalk.red('✗'), `Task 조회 실패: ${error.message}`)
            return null
        }

        return data as Record<string, unknown> | null
    }

    /** 연결 상태 확인 */
    async checkConnection(): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('cli_events')
                .select('id')
                .limit(1)

            if (error) throw error
            return true
        } catch {
            return false
        }
    }

    // --- 로컬 실패 이벤트 관리 ---

    private getFailedEventsPath(): string {
        return join(this.projectPath, '.orchestrator', 'failed_events.json')
    }

    private loadFailedEvents(): FailedEvent[] {
        const path = this.getFailedEventsPath()
        if (!existsSync(path)) return []
        try {
            return JSON.parse(readFileSync(path, 'utf-8')) as FailedEvent[]
        } catch {
            return []
        }
    }

    private saveFailedEvent(event: FailedEvent): void {
        ensureOrchestratorDir(this.projectPath)
        const events = this.loadFailedEvents()
        events.push(event)
        this.writeFailedEvents(events)
    }

    private writeFailedEvents(events: FailedEvent[]): void {
        ensureOrchestratorDir(this.projectPath)
        writeFileSync(this.getFailedEventsPath(), JSON.stringify(events, null, 2), 'utf-8')
    }
}

// === CLI에서 환경변수 로드 ===
// 우선순위: 환경변수 > .env.local > .env
// ORCHX_ 접두어와 VITE_ 접두어 모두 인식 (같은 Supabase 프로젝트 공유)

function parseEnvFile(filePath: string): Record<string, string> {
    if (!existsSync(filePath)) return {}
    const content = readFileSync(filePath, 'utf-8')
    const vars: Record<string, string> = {}
    for (const line of content.split('\n')) {
        const match = line.match(/^([A-Z_]+)=["']?(.+?)["']?\s*$/)
        if (match) vars[match[1]] = match[2]
    }
    return vars
}

function loadEnv(projectPath: string): { url: string; key: string } | null {
    // 1. 환경변수 우선 (ORCHX_ 또는 VITE_ 접두어 모두 인식)
    const url = process.env.ORCHX_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
    const key = process.env.ORCHX_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

    if (url && key) return { url, key }

    // 2. .env.local → .env 순서로 파일 탐색
    //    프로젝트 루트(packages/orchx의 상위 2단계)도 탐색
    const searchPaths = [
        join(projectPath, '.env.local'),
        join(projectPath, '.env'),
        join(projectPath, '..', '..', '.env.local'),  // monorepo 루트
        join(projectPath, '..', '..', '.env'),
    ]

    for (const envPath of searchPaths) {
        const vars = parseEnvFile(envPath)
        const envUrl = vars.ORCHX_SUPABASE_URL ?? vars.VITE_SUPABASE_URL
        const envKey = vars.ORCHX_SUPABASE_ANON_KEY ?? vars.VITE_SUPABASE_ANON_KEY
        if (envUrl && envKey) return { url: envUrl, key: envKey }
    }

    return null
}

function createSyncClient(projectPath: string): SyncClient | null {
    const env = loadEnv(projectPath)
    if (!env) {
        console.error(chalk.red('✗ ORCHX_SUPABASE_URL, ORCHX_SUPABASE_ANON_KEY 환경변수가 필요합니다.'))
        console.error(chalk.dim('  .env 파일 또는 환경변수로 설정하세요.'))
        return null
    }

    // HTTPS 강제 확인
    if (!env.url.startsWith('https://')) {
        console.error(chalk.red('✗ Supabase URL은 https:// 로 시작해야 합니다.'))
        return null
    }

    return new SyncClient(env.url, env.key, projectPath)
}

// === syncCommand ===

export function syncCommand(): Command {
    const cmd = new Command('sync')
        .description('CLI↔서버 통신 관리')

    // orchx sync send --type <type> [--payload <json>]
    cmd.command('send')
        .description('이벤트를 서버에 전송')
        .requiredOption('-t, --type <type>', '이벤트 타입 (e.g. test.ping)')
        .option('-p, --payload <json>', 'JSON 페이로드', '{}')
        .action(async (opts: { type: string; payload: string }) => {
            const cwd = process.cwd()
            const client = createSyncClient(cwd)
            if (!client) process.exit(1)

            let payload: Record<string, unknown>
            try {
                payload = JSON.parse(opts.payload) as Record<string, unknown>
            } catch {
                console.error(chalk.red('✗ 잘못된 JSON 페이로드'))
                process.exit(1)
            }

            await client.sendEvent(opts.type, payload)
        })

    // orchx sync retry
    cmd.command('retry')
        .description('실패한 이벤트 재전송')
        .action(async () => {
            const cwd = process.cwd()
            const client = createSyncClient(cwd)
            if (!client) process.exit(1)

            const result = await client.retryFailed()
            console.log(chalk.dim(`재시도: ${result.retried}건, 성공: ${result.succeeded}건`))
        })

    // orchx sync status
    cmd.command('status')
        .description('서버 연결 상태 확인')
        .action(async () => {
            const cwd = process.cwd()
            const client = createSyncClient(cwd)
            if (!client) process.exit(1)

            const connected = await client.checkConnection()
            if (connected) {
                console.log(chalk.green('✓'), '서버 연결 정상')
            } else {
                console.log(chalk.red('✗'), '서버 연결 실패')
            }

            // 실패 이벤트 수 표시
            const failedPath = join(cwd, '.orchestrator', 'failed_events.json')
            if (existsSync(failedPath)) {
                try {
                    const failed = JSON.parse(readFileSync(failedPath, 'utf-8')) as unknown[]
                    if (failed.length > 0) {
                        console.log(chalk.yellow('⚠'), `미전송 이벤트: ${failed.length}건`)
                    }
                } catch { /* ignore */ }
            }
        })

    return cmd
}
