// =========================================
// AIReviewPanel — AI Health Review (심플 모드)
// 점수 + 한줄 요약 기본 표시, 클릭 시 상세 펼침
// ========================================

import { useState } from 'react'
import { useAIReview } from '../../hooks/useAIReview'
import { useCliEvents } from '../../hooks/useCliEvents'
import { usePlans } from '../../hooks/usePlans'
import { useWorkItems } from '../../hooks/useWorkItems'
import { useEventLogs } from '../../hooks/useEventLogs'
import { useOrchestration } from '../../hooks/useOrchestration'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
    Sparkles,
    Shield,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Clock,
    ChevronDown,
    ChevronRight,
    Loader2,
} from 'lucide-react'

// === 건강도 색상 ===

const HEALTH_COLORS: Record<string, { bg: string; text: string; border: string; ring: string }> = {
    excellent: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-500' },
    healthy: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600', border: 'border-green-200', ring: 'ring-green-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600', border: 'border-amber-200', ring: 'ring-amber-500' },
    critical: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600', border: 'border-red-200', ring: 'ring-red-500' },
}

const TREND_ICONS = {
    improving: <TrendingUp className="w-3.5 h-3.5 text-green-500" />,
    stable: <Minus className="w-3.5 h-3.5 text-muted-foreground" />,
    declining: <TrendingDown className="w-3.5 h-3.5 text-red-500" />,
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return '방금 전'
    if (min < 60) return `${min}분 전`
    const hours = Math.floor(min / 60)
    return `${hours}시간 전`
}

export function AIReviewPanel() {
    const { plans } = usePlans()
    const { items: workItems } = useWorkItems()
    const { logs: eventLogs } = useEventLogs({ limit: 200 })
    const { stats } = useOrchestration()
    const { events: cliEvents } = useCliEvents({ limit: 100, realtime: false })
    const agentCount = stats.length

    const { review, loading, error, cachedAt, runReview, clearCache } = useAIReview({
        plans,
        workItems: workItems.map(w => ({
            status: w.status,
            started_at: w.started_at,
            completed_at: w.completed_at,
        })),
        eventLogs: eventLogs.map(e => ({
            id: e.id,
            event_type: e.event_type,
            payload: e.payload as Record<string, unknown>,
            triggered_at: e.triggered_at,
            applied_at: e.applied_at,
            actor: e.actor as 'user' | 'system' | 'ai',
            created_at: e.triggered_at,
        })),
        agentCount,
        cliEvents,
    })

    const hasEnoughData = plans.length > 0 || workItems.length > 0
    const healthStyle = review ? HEALTH_COLORS[review.health_label] ?? HEALTH_COLORS.healthy : null
    const [expanded, setExpanded] = useState(false)

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        AI Health Review
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                        {cachedAt && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {timeAgo(cachedAt)}
                            </span>
                        )}
                        {review && (
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={clearCache}>
                                초기화
                            </Button>
                        )}
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => void runReview()}
                            disabled={loading || !hasEnoughData}
                        >
                            {loading ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            )}
                            {loading ? '분석 중...' : review ? '다시 분석' : '리뷰 실행'}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
                {/* 에러 */}
                {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                        {error}
                    </div>
                )}

                {/* 미실행 */}
                {!review && !loading && !error && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        <Sparkles className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                        <p className="text-xs">"리뷰 실행"을 클릭하여 분석을 시작하세요</p>
                    </div>
                )}

                {/* 로딩 */}
                {loading && !review && (
                    <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 mx-auto mb-1.5 animate-spin text-violet-500" />
                        <p className="text-xs text-muted-foreground">Gemini 분석 중...</p>
                    </div>
                )}

                {/* ═══ 심플 결과 ═══ */}
                {review && healthStyle && (
                    <div className="space-y-2">
                        {/* 점수 + 한줄 요약 (항상 표시) */}
                        <button
                            type="button"
                            onClick={() => setExpanded(prev => !prev)}
                            className="w-full text-left cursor-pointer"
                        >
                            <div className={`p-3 rounded-lg border ${healthStyle.bg} ${healthStyle.border} flex items-center gap-3`}>
                                {/* 점수 원 */}
                                <div className={`w-10 h-10 rounded-full ${healthStyle.bg} border-2 ${healthStyle.border} flex items-center justify-center shrink-0`}>
                                    <span className={`text-sm font-bold ${healthStyle.text}`}>{review.health_score}</span>
                                </div>
                                {/* 라벨 + velocity 한줄 */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-semibold ${healthStyle.text} capitalize`}>
                                            {review.health_label}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            {TREND_ICONS[review.velocity.trend]}
                                            {review.velocity.trend}
                                        </span>
                                        {review.risk_items.length > 0 && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                <AlertTriangle className="w-3 h-3 mr-0.5" />
                                                {review.risk_items.length}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {review.velocity.summary}
                                    </p>
                                </div>
                                {/* 펼침 아이콘 */}
                                {expanded
                                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                }
                            </div>
                        </button>

                        {/* ═══ 상세 (펼쳤을 때만) ═══ */}
                        {expanded && (
                            <div className="space-y-3 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                {/* 위험 항목 */}
                                {review.risk_items.length > 0 && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-medium flex items-center gap-1">
                                            <Shield className="w-3.5 h-3.5 text-amber-500" />
                                            위험 항목
                                        </h4>
                                        {review.risk_items.map((risk, i) => (
                                            <div key={i} className="flex items-start gap-1.5 text-xs p-1.5 rounded bg-muted/20">
                                                <Badge
                                                    variant={risk.level === 'high' ? 'destructive' : 'outline'}
                                                    className="text-[9px] shrink-0 mt-0.5 px-1 py-0"
                                                >
                                                    {risk.level}
                                                </Badge>
                                                <span>
                                                    <span className="font-medium">{risk.area}</span>
                                                    <span className="text-muted-foreground"> — {risk.reason}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 추천 행동 */}
                                {review.next_actions.length > 0 && (
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-medium">추천 행동</h4>
                                        {review.next_actions.map((action, i) => (
                                            <div key={i} className="flex items-start gap-1.5 text-xs">
                                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                                                <span>{action}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
