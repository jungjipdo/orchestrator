// ============================================
// config/session.ts — .orchestrator/session.json CRUD
// ============================================

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const ORCHESTRATOR_DIR = '.orchestrator'
const SESSION_FILE = 'session.json'

export interface OrchestratorSession {
    session_id: string
    agent_type: string
    task_name: string
    project_path: string
    started_at: string
    // 파일 변경 통계 (watch가 업데이트)
    files_changed: number
    commits_detected: number
}

function getSessionPath(projectPath: string): string {
    return join(projectPath, ORCHESTRATOR_DIR, SESSION_FILE)
}

function getOrchestratorDir(projectPath: string): string {
    return join(projectPath, ORCHESTRATOR_DIR)
}

export function ensureOrchestratorDir(projectPath: string): string {
    const dir = getOrchestratorDir(projectPath)
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }
    return dir
}

export function readSession(projectPath: string): OrchestratorSession | null {
    const sessionPath = getSessionPath(projectPath)
    if (!existsSync(sessionPath)) return null

    try {
        const raw = readFileSync(sessionPath, 'utf-8')
        return JSON.parse(raw) as OrchestratorSession
    } catch {
        return null
    }
}

export function writeSession(projectPath: string, session: OrchestratorSession): void {
    ensureOrchestratorDir(projectPath)
    const sessionPath = getSessionPath(projectPath)
    writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8')
}

export function deleteSession(projectPath: string): void {
    const sessionPath = getSessionPath(projectPath)
    if (existsSync(sessionPath)) {
        unlinkSync(sessionPath)
    }
}

export function createSession(
    projectPath: string,
    agentType: string,
    taskName: string,
): OrchestratorSession {
    const session: OrchestratorSession = {
        session_id: randomUUID(),
        agent_type: agentType,
        task_name: taskName,
        project_path: projectPath,
        started_at: new Date().toISOString(),
        files_changed: 0,
        commits_detected: 0,
    }
    writeSession(projectPath, session)
    return session
}

export function updateSessionStats(
    projectPath: string,
    updates: Partial<Pick<OrchestratorSession, 'files_changed' | 'commits_detected'>>,
): void {
    const session = readSession(projectPath)
    if (!session) return

    if (updates.files_changed !== undefined) session.files_changed = updates.files_changed
    if (updates.commits_detected !== undefined) session.commits_detected = updates.commits_detected
    writeSession(projectPath, session)
}
