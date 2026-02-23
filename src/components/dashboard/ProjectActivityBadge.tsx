// ============================================
// ProjectActivityBadge — 프로젝트 Activity 요약 뱃지
// Active Release 카드 내부에 삽입
// ============================================

import { useProjectActivity } from '../../hooks/useProjectActivity'
import { FileText, GitCommit, AlertTriangle, TestTube2 } from 'lucide-react'

interface Props {
    repoFullName: string
}

export function ProjectActivityBadge({ repoFullName }: Props) {
    const { activity, loading } = useProjectActivity(repoFullName)

    // 활동이 없으면 안 보여줌
    if (loading || (activity.filesChanged === 0 && activity.commitsDetected === 0 && activity.violations === 0 && activity.testsPassed === 0)) {
        return null
    }

    return (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Today</span>
            {activity.filesChanged > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                    <FileText className="w-3 h-3" />
                    {activity.filesChanged}
                </span>
            )}
            {activity.commitsDetected > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400">
                    <GitCommit className="w-3 h-3" />
                    {activity.commitsDetected}
                </span>
            )}
            {activity.violations > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    {activity.violations}
                </span>
            )}
            {(activity.testsPassed > 0 || activity.testsFailed > 0) && (
                <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${activity.testsFailed > 0
                    ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                    : 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                    }`}>
                    <TestTube2 className="w-3 h-3" />
                    {activity.testsPassed}/{activity.testsPassed + activity.testsFailed}
                </span>
            )}
        </div>
    )
}
