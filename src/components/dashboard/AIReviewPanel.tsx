// ============================================
// AIReviewPanel — AI Review 실행 + 결과 + Evidence 뱃지
// Dashboard에 배치되는 프로젝트 건강도 분석 패널
// ============================================

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
    FileSearch,
    TestTube2,
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
    improving: <TrendingUp className="w-4 h-4 text-green-500" />,
    stable: <Minus className="w-4 h-4 text-muted-foreground" />,
    declining: <TrendingDown className="w-4 h-4 text-red-500" />,
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
    // 데이터 소스
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

    // 캐시가 없으면 자동으로 리뷰 실행하지 않음 (사용자가 직접 클릭)
    const hasEnoughData = plans.length > 0 || workItems.length > 0

    const healthStyle = review ? HEALTH_COLORS[review.health_label] ?? HEALTH_COLORS.healthy : null

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        AI Health Review
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {cachedAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(cachedAt)}
                            </span>
                        )}
                        {review && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearCache}>
                                초기화
                            </Button>
                        )}
                        <Button
                            size="sm"
                            className="h-8"
                            onClick={() => void runReview()}
                            disabled={loading || !hasEnoughData}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-1.5" />
                            )}
                            {loading ? '분석 중...' : review ? '다시 분석' : '리뷰 실행'}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* 에러 */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* 리뷰 없음 */}
                {!review && !loading && !error && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>"리뷰 실행" 버튼을 클릭하여 AI 건강도 분석을 시작하세요</p>
                        {!hasEnoughData && <p className="text-xs mt-1">Plans 또는 Work Items 데이터가 필요합니다</p>}
                    </div>
                )}

                {/* 로딩 */}
                {loading && !review && (
                    <div className="text-center py-6">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-violet-500" />
                        <p className="text-sm text-muted-foreground">Gemini로 프로젝트 건강도 분석 중...</p>
                    </div>
                )}

                {/* 리뷰 결과 */}
                {review && healthStyle && (
                    <div className="space-y-4">
                        {/* 건강도 점수 */}
                        <div className={`p-4 rounded-xl border ${healthStyle.bg} ${healthStyle.border}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-14 h-14 rounded-full ${healthStyle.bg} border-2 ${healthStyle.border} flex items-center justify-center ring-2 ${healthStyle.ring} ring-offset-2`}>
                                        <span className={`text-xl font-bold ${healthStyle.text}`}>{review.health_score}</span>
                                    </div>
                                    <div>
                                        <div className={`text-lg font-semibold ${healthStyle.text} capitalize`}>
                                            {review.health_label}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Health Score</div>
                                    </div>
                                </div>

                                {/* Evidence 뱃지 */}
                                {review.evidence && (
                                    <div className="flex flex-wrap gap-1.5 justify-end max-w-[200px]">
                                        {review.evidence.data_sources.map(src => (
                                            <Badge key={src} variant="outline" className="text-[10px] px-1.5 py-0">
                                                {src}
                                            </Badge>
                                        ))}
                                        {review.evidence.cli_events_count > 0 && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600">
                                                <FileSearch className="w-3 h-3 mr-0.5" />
                                                CLI {review.evidence.cli_events_count}
                                            </Badge>
                                        )}
                                        {review.evidence.violation_count > 0 && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-200 text-red-600">
                                                <AlertTriangle className="w-3 h-3 mr-0.5" />
                                                위반 {review.evidence.violation_count}
                                            </Badge>
                                        )}
                                        {review.evidence.test_pass_rate !== null && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-600">
                                                <TestTube2 className="w-3 h-3 mr-0.5" />
                                                {review.evidence.test_pass_rate}%
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Velocity */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
                            {TREND_ICONS[review.velocity.trend]}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">{review.velocity.summary}</div>
                                <div className="text-xs text-muted-foreground">
                                    평균 {review.velocity.avg_completion_hours}h • {review.velocity.trend}
                                </div>
                            </div>
                        </div>

                        {/* Risk Items */}
                        {review.risk_items.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium flex items-center gap-1.5">
                                    <Shield className="w-4 h-4 text-amber-500" />
                                    위험 항목
                                </h4>
                                {review.risk_items.map((risk, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/20">
                                        <Badge
                                            variant={risk.level === 'high' ? 'destructive' : 'outline'}
                                            className="text-[10px] shrink-0 mt-0.5"
                                        >
                                            {risk.level}
                                        </Badge>
                                        <div>
                                            <span className="font-medium">{risk.area}</span>
                                            <span className="text-muted-foreground"> — {risk.reason}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Stale Alerts */}
                        {review.stale_alerts.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    정체 경고
                                </h4>
                                {review.stale_alerts.map((alert, i) => (
                                    <div key={i} className="text-sm p-2 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100">
                                        <div className="font-medium">{alert.title} ({alert.stale_days}일)</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{alert.suggestion}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Next Actions */}
                        {review.next_actions.length > 0 && (
                            <div className="space-y-1.5">
                                <h4 className="text-sm font-medium">추천 행동</h4>
                                {review.next_actions.map((action, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                        <span>{action}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
