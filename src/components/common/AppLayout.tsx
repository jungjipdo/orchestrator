// ============================================
// AppLayout — 6탭 사이드바 + 헤더 + 뷰 전환
// Settings는 하단 분리 유지
// ============================================

import { useCallback, useState } from 'react'
import { useSessionLog } from '../../hooks/useSessionLog'
import { useTheme } from '../../hooks/useTheme'
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
} from 'lucide-react'
import { Dashboard } from '../dashboard/Dashboard'
import { ReleasePlanView } from '../views/ReleasePlanView'
import { TimelineView } from '../views/TimelineView'
import { ActiveTaskView } from '../views/ActiveTaskView'
import { LogView } from '../views/LogView'
import { SettingsView } from '../views/SettingsView'

// ─── 6탭 ViewType ───
export type ViewType = 'dashboard' | 'release-plan' | 'timeline' | 'active-task' | 'log' | 'settings'

interface NavItem {
    id: ViewType
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge: string | null
}

export function AppLayout() {
    const { activeSession, refresh: refreshSession } = useSessionLog()
    const { toggleTheme, isDark } = useTheme()
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
        { id: 'log', label: 'Log', icon: ScrollText, badge: null },
    ]

    // ─── 네비게이션 콜백 ───
    const handleNavigate = useCallback((tab: ViewType) => {
        setActiveTab(tab)
        setSidebarOpen(false)
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
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center cursor-pointer">
                            <span className="text-sm">U</span>
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
                    w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors
                    ${activeTab === item.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                        }
                  `}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-4 h-4" />
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
                <main className="flex-1 p-6 lg:ml-0">
                    <div className="max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    )
}
