// ============================================
// ActiveTaskView — AI Automation Hub (레퍼런스 AIAutomationHub 기반)
// AI Metrics + Insights + Automation Tasks
// ============================================

import { useMemo } from 'react'
import { useWorkItems } from '../../hooks/useWorkItems'
import { useSessionLog } from '../../hooks/useSessionLog'
import { useEventLogs } from '../../hooks/useEventLogs'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import type { WorkItemRow } from '../../types/database'
import {
    Zap,
    Brain,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Clock,
    Target,
} from 'lucide-react'

// ─── AI Insight 타입 ───
interface AIInsight {
    id: string
    type: 'risk' | 'optimization' | 'prediction' | 'recommendation'
    title: string
    description: string
    impact: 'low' | 'medium' | 'high' | 'critical'
    confidence: number
    actionable: boolean
}

// ─── Helpers ───
const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
        case 'risk': return <AlertTriangle className="w-4 h-4" />
        case 'optimization': return <TrendingUp className="w-4 h-4" />
        case 'prediction': return <Target className="w-4 h-4" />
        case 'recommendation': return <Brain className="w-4 h-4" />
    }
}

const getInsightColor = (impact: AIInsight['impact']) => {
    switch (impact) {
        case 'critical': return 'text-red-600 bg-red-50 border-red-200'
        case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
        case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
        case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
    }
}

// ─── AI Insight 자동 생성 ───
function generateInsights(items: WorkItemRow[]): AIInsight[] {
    const insights: AIInsight[] = []
    const now = new Date()

    // Risk: 마감 3일 이내 + status != done
    const urgentItems = items.filter(i => {
        if (!i.due_at || i.status === 'done') return false
        const dueDate = new Date(i.due_at)
        const daysLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        return daysLeft <= 3 && daysLeft >= 0
    })
    if (urgentItems.length > 0) {
        insights.push({
            id: 'risk-deadline',
            type: 'risk',
            title: 'Upcoming Deadline Risk',
            description: `${urgentItems.length} task(s) due within 3 days: ${urgentItems.map(i => i.title).slice(0, 2).join(', ')}`,
            impact: urgentItems.length >= 3 ? 'critical' : 'high',
            confidence: 95,
            actionable: true,
        })
    }

    // Optimization: blocked 항목이 있음
    const blockedItems = items.filter(i => i.status === 'blocked')
    if (blockedItems.length > 0) {
        insights.push({
            id: 'opt-blocked',
            type: 'optimization',
            title: 'Blocked Tasks Detected',
            description: `${blockedItems.length} task(s) are blocked. Resolving these could improve throughput significantly.`,
            impact: 'medium',
            confidence: 88,
            actionable: true,
        })
    }

    // Prediction: 완료율 기반 예측
    const doneCount = items.filter(i => i.status === 'done').length
    const totalCount = items.length
    if (totalCount > 0) {
        const completionRate = Math.round((doneCount / totalCount) * 100)
        insights.push({
            id: 'pred-completion',
            type: 'prediction',
            title: 'Completion Rate Analysis',
            description: `Current completion rate is ${completionRate}%. ${completionRate < 50 ? 'Consider reprioritizing tasks.' : 'On track for timely delivery.'}`,
            impact: completionRate < 30 ? 'high' : 'medium',
            confidence: 78,
            actionable: completionRate < 50,
        })
    }

    // Recommendation: 에너지 레벨 분석
    const highEnergyPending = items.filter(i => i.energy === 'high' && i.status !== 'done')
    if (highEnergyPending.length > 0) {
        insights.push({
            id: 'rec-energy',
            type: 'recommendation',
            title: 'High-Energy Tasks Available',
            description: `${highEnergyPending.length} high-energy task(s) awaiting attention. Schedule during peak focus hours for best results.`,
            impact: 'low',
            confidence: 85,
            actionable: true,
        })
    }

    return insights
}

export function ActiveTaskView() {
    const { items: allItems, loading: itemsLoading } = useWorkItems()
    const { items: activeItems } = useWorkItems({ status: 'active' })
    const { activeSession } = useSessionLog()
    const { logs } = useEventLogs({ limit: 50 })

    // ─── Metrics ───
    const metrics = useMemo(() => {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const completedToday = allItems.filter(i =>
            i.status === 'done' &&
            new Date(i.updated_at) >= todayStart
        ).length

        const aiEvents = logs.filter(l => l.actor === 'ai')
        const errorEvents = logs.filter(l => l.event_type.includes('error'))
        const errorRate = logs.length > 0 ? (errorEvents.length / logs.length * 100).toFixed(1) : '0'

        // Time saved: estimate_min 합산 (완료 항목)
        const savedMinutes = allItems
            .filter(i => i.status === 'done' && i.estimate_min)
            .reduce((sum, i) => sum + (i.estimate_min ?? 0), 0)
        const savedHours = (savedMinutes / 60).toFixed(1)

        return {
            timeSaved: `${savedHours}h`,
            activeTasks: activeItems.length,
            completedToday,
            errorRate: `${errorRate}%`,
            aiEventCount: aiEvents.length,
        }
    }, [allItems, activeItems, logs])

    // ─── AI Insights ───
    const insights = useMemo(() => generateInsights(allItems), [allItems])

    // ─── Active Automation Tasks (AI actor events) ───
    const automationTasks = useMemo(() => {
        const aiLogs = logs.filter(l => l.actor === 'ai').slice(0, 5)
        return aiLogs.map(log => ({
            id: log.id,
            name: log.event_type.replace(/_/g, ' '),
            status: log.applied_at ? 'completed' as const : 'running' as const,
            timestamp: new Date(log.triggered_at).toLocaleString(),
        }))
    }, [logs])

    if (itemsLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-muted rounded animate-pulse w-64" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold">AI Automation Hub</h2>
                    <p className="text-muted-foreground">Intelligent orchestration and insights for your workflow</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" disabled>
                        <Brain className="w-4 h-4 mr-2" />
                        Train Model
                    </Button>
                    <Button disabled>
                        <Zap className="w-4 h-4 mr-2" />
                        New Automation
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Time Saved</CardTitle>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.timeSaved}</div>
                        <p className="text-xs text-muted-foreground">Estimated from completed tasks</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Active Tasks</CardTitle>
                        <Zap className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.activeTasks}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeSession ? 'Session running' : 'No active session'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Completed Today</CardTitle>
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.completedToday}</div>
                        <p className="text-xs text-muted-foreground">Tasks completed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Error Rate</CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.errorRate}</div>
                        <p className="text-xs text-muted-foreground">{metrics.aiEventCount} AI events</p>
                    </CardContent>
                </Card>
            </div>

            {/* AI Insights */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        AI Insights & Recommendations
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {insights.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No insights available. Add more tasks to enable AI analysis.</p>
                        </div>
                    ) : (
                        insights.map(insight => (
                            <div key={insight.id} className={`p-4 rounded-lg border ${getInsightColor(insight.impact)}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                        {getInsightIcon(insight.type)}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium">{insight.title}</h4>
                                                <Badge variant="outline" className="text-xs">
                                                    {insight.confidence}% confidence
                                                </Badge>
                                            </div>
                                            <p className="text-sm opacity-90">{insight.description}</p>
                                        </div>
                                    </div>
                                    {insight.actionable && (
                                        <Button size="sm" variant="outline">
                                            Take Action
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Automation Tasks */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Active Automation Tasks
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {automationTasks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No AI automation tasks yet.</p>
                        </div>
                    ) : (
                        automationTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="text-xl">🤖</div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            {task.status === 'completed' ?
                                                <CheckCircle className="w-4 h-4 text-green-500" /> :
                                                <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                                            }
                                            <span className="font-medium capitalize">{task.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                                AI Agent
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {task.timestamp}
                                        </div>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline">
                                    Monitor
                                </Button>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
