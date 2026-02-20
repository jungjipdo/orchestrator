// ============================================
// AppLayout — 6탭 사이드바 + 헤더 + 뷰 전환
// 모바일: 하단 탭 바 + 스와이프 제스처
// ============================================

import { useCallback, useState, useEffect, useRef } from 'react'
import { useSessionLog } from '../../hooks/useSessionLog'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
    LayoutDashboard,
    Clock,
    GitBranch,
    Zap,
    ScrollText,
    Settings,
    Bell,
    Menu,
    X,
    Moon,
    Sun,
    LogOut,
    Bot,
} from 'lucide-react'
import { Dashboard } from '../dashboard/Dashboard'
import { ReleasePlanView } from '../views/ReleasePlanView'
import { TimelineView } from '../views/TimelineView'
import { ActiveTaskView } from '../views/ActiveTaskView'
import { LogView } from '../views/LogView'
import { SettingsView } from '../views/SettingsView'
import { OrchestrationView } from '../views/OrchestrationView'

// ─── 6탭 ViewType ───
export type ViewType = 'dashboard' | 'release-plan' | 'timeline' | 'active-task' | 'orchestration' | 'log' | 'settings'

interface NavItem {
    id: ViewType
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge: string | null
}

export function AppLayout() {
    const { activeSession, refresh: refreshSession } = useSessionLog()
    const { toggleTheme, isDark } = useTheme()
    const { user, signOut } = useAuth()
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [activeTab, setActiveTab] = useState<ViewType>('dashboard')
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const refresh = useCallback(() => {
        setRefreshTrigger((v) => v + 1)
        void refreshSession()
    }, [refreshSession])

    // ─── 메인 네비게이션 (Settings 제외) ───
    const navigationItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'release-plan', label: 'Release Plan', icon: GitBranch, badge: null },
        { id: 'timeline', label: 'Timeline', icon: Clock, badge: null },
        { id: 'active-task', label: 'Active Task', icon: Zap, badge: activeSession ? 'Running' : null },
        { id: 'orchestration', label: 'Orchestration', icon: Bot, badge: null },
        { id: 'log', label: 'Log', icon: ScrollText, badge: null },
    ]

    // ─── 모바일 하단 탭 (5개 — More로 Settings+Log 묶음) ───
    const mobileTabItems: { id: ViewType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
        { id: 'timeline', label: 'Timeline', icon: Clock },
        { id: 'release-plan', label: 'Releases', icon: GitBranch },
        { id: 'active-task', label: 'Tasks', icon: Zap },
        { id: 'settings', label: 'More', icon: Settings },
    ]

    // ─── 네비게이션 콜백 ───
    const handleNavigate = useCallback((tab: ViewType) => {
        setActiveTab(tab)
        setSidebarOpen(false)
    }, [])

    // ─── 터치 스와이프 (좌측 edge → 사이드바 열기) ───
    const touchRef = useRef<{ startX: number; startY: number } | null>(null)

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0]
            if (touch.clientX < 24) {
                touchRef.current = { startX: touch.clientX, startY: touch.clientY }
            }
        }
        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchRef.current) return
            const touch = e.changedTouches[0]
            const dx = touch.clientX - touchRef.current.startX
            const dy = Math.abs(touch.clientY - touchRef.current.startY)
            if (dx > 60 && dy < 100) {
                setSidebarOpen(true)
            }
            touchRef.current = null
        }
        document.addEventListener('touchstart', handleTouchStart, { passive: true })
        document.addEventListener('touchend', handleTouchEnd, { passive: true })
        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchend', handleTouchEnd)
        }
    }, [])

    // ─── 뷰 렌더 ───
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <Dashboard
                        activeTab={activeTab}
                        refreshTrigger={refreshTrigger}
                        refresh={refresh}
                        activeSession={activeSession}
                        onNavigate={handleNavigate}
                    />
                )
            case 'release-plan':
                return <ReleasePlanView />
            case 'timeline':
                return <TimelineView onNavigate={handleNavigate} />
            case 'active-task':
                return <ActiveTaskView />
            case 'orchestration':
                return <OrchestrationView onNavigateToPlan={() => handleNavigate('release-plan')} />
            case 'log':
                return <LogView />
            case 'settings':
                return <SettingsView />
            default:
                return null
        }
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header
                className="sticky top-0 z-50 border-b"
                style={{
                    background: 'var(--glass-bg)',
                    borderColor: 'var(--glass-border)',
                    backdropFilter: `blur(var(--glass-blur))`,
                    WebkitBackdropFilter: `blur(var(--glass-blur))`,
                    boxShadow: 'var(--glass-shadow)',
                }}
            >
                <div className="flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <Zap className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="font-semibold">Orchestrator</h1>
                                <p className="text-xs text-muted-foreground">Continuous Development & AI Release Management</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Session Status */}
                        {activeSession && (
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs">Session Active</span>
                            </div>
                        )}

                        <Button variant="ghost" size="sm" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="relative">
                            <Bell className="w-4 h-4" />
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                0
                            </Badge>
                        </Button>
                        <div className="flex items-center gap-2">
                            {user?.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url as string}
                                    alt="avatar"
                                    className="w-8 h-8 rounded-full"
                                />
                            ) : (
                                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                    <span className="text-sm">
                                        {(user?.email?.[0] ?? 'U').toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={signOut}
                                title="로그아웃"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`
          fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 border-r transition-transform duration-200 z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
                    style={{
                        background: 'var(--glass-bg)',
                        borderColor: 'var(--glass-border)',
                        backdropFilter: `blur(var(--glass-blur))`,
                        WebkitBackdropFilter: `blur(var(--glass-blur))`,
                    }}
                >
                    {/* Main Nav */}
                    <nav className="p-4 space-y-2">
                        {navigationItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(item.id)
                                        setSidebarOpen(false)
                                    }}
                                    className={`
                    w-full flex items-center justify-between px-4 py-3 text-base rounded-lg transition-colors
                    ${activeTab === item.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }
                  `}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-5 h-5" />
                                        <span>{item.label}</span>
                                    </div>
                                    {item.badge && (
                                        <Badge
                                            variant={activeTab === item.id ? 'secondary' : 'outline'}
                                            className="text-xs"
                                        >
                                            {item.badge}
                                        </Badge>
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    {/* Quick Actions */}
                    <div className="p-4 border-t">
                        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Quick Actions</h4>
                        <div className="space-y-2">
                            <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setActiveTab('release-plan')}>
                                <GitBranch className="w-4 h-4 mr-2" />
                                View Releases
                            </Button>
                            <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setActiveTab('active-task')}>
                                <Zap className="w-4 h-4 mr-2" />
                                AI Hub
                            </Button>
                        </div>
                    </div>

                    {/* Settings — 하단 분리 유지 */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('settings')
                                setSidebarOpen(false)
                            }}
                            className={`
                w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
                ${activeTab === 'settings'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }
              `}
                        >
                            <Settings className="w-4 h-4" />
                            <span>Settings</span>
                        </button>
                    </div>
                </aside>

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-background/50 backdrop-blur-sm z-30 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6 lg:ml-0">
                    <div className="max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Tab Bar */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-50 border-t lg:hidden"
                style={{
                    background: 'var(--glass-bg)',
                    borderColor: 'var(--glass-border)',
                    backdropFilter: `blur(var(--glass-blur))`,
                    WebkitBackdropFilter: `blur(var(--glass-blur))`,
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
            >
                <div className="flex items-center justify-around h-14">
                    {mobileTabItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleNavigate(item.id)}
                                className={`flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] transition-colors ${isActive
                                    ? 'text-primary font-medium'
                                    : 'text-muted-foreground'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
