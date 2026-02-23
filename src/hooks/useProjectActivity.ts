// ============================================
// useProjectActivity — 프로젝트별 CLI 이벤트 활동 요약
// ============================================

import { useCallback, useEffect, useState } from 'react'
import { getCliEvents } from '../lib/supabase/cliEvents'
import type { CliEventRow } from '../types/database'

export interface ProjectActivity {
    filesChanged: number
    commitsDetected: number
    violations: number
    testsPassed: number
    testsFailed: number
    lastEvent: string | null  // ISO timestamp
}

const EMPTY_ACTIVITY: ProjectActivity = {
    filesChanged: 0,
    commitsDetected: 0,
    violations: 0,
    testsPassed: 0,
    testsFailed: 0,
    lastEvent: null,
}

export function useProjectActivity(repoFullName: string | null | undefined) {
    const [activity, setActivity] = useState<ProjectActivity>(EMPTY_ACTIVITY)
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        if (!repoFullName) {
            setActivity(EMPTY_ACTIVITY)
            return
        }

        setLoading(true)
        try {
            // 오늘 시작 시각
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const events = await getCliEvents({
                since: today.toISOString(),
                limit: 500,
            })

            // payload.repo_full_name으로 필터링
            const projectEvents = events.filter(
                (e) => (e.payload as Record<string, unknown>)?.repo_full_name === repoFullName,
            )

            const summary = summarizeEvents(projectEvents)
            setActivity(summary)
        } catch {
            // 실패 시 빈 상태 유지
        } finally {
            setLoading(false)
        }
    }, [repoFullName])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { activity, loading, refresh }
}

function summarizeEvents(events: CliEventRow[]): ProjectActivity {
    let filesChanged = 0
    let commitsDetected = 0
    let violations = 0
    let testsPassed = 0
    let testsFailed = 0

    for (const e of events) {
        switch (e.event_type) {
            case 'file.changed':
                filesChanged++
                break
            case 'commit.detected':
                commitsDetected++
                break
            case 'contract.violation':
                violations++
                break
            case 'test.completed': {
                const p = e.payload as { passed?: number; failed?: number }
                testsPassed += p.passed ?? 0
                testsFailed += p.failed ?? 0
                break
            }
        }
    }

    return {
        filesChanged,
        commitsDetected,
        violations,
        testsPassed,
        testsFailed,
        lastEvent: events[0]?.created_at ?? null,
    }
}
