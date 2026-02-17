// ============================================
// AppLayout — Header + Main + CommandToolbar
// ============================================

import { useCallback, useState } from 'react'
import { Outlet } from 'react-router'
import { useSessionLog } from '../../hooks/useSessionLog'
import type { OutletContextType } from '../../types/ui'
import { CommandToolbar } from '../command/CommandToolbar'
import './AppLayout.css'

export function AppLayout() {
    const { activeSession, refresh: refreshSession } = useSessionLog()
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const refresh = useCallback(() => {
        setRefreshTrigger((value) => value + 1)
        void refreshSession()
    }, [refreshSession])

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="app-header__brand">
                    <span className="app-header__logo">◆</span>
                    <div>
                        <h1>Orchestrator</h1>
                        <p>GUI-first command workspace</p>
                    </div>
                </div>

                <CommandToolbar activeSession={activeSession} onCommandComplete={refresh} />
            </header>

            <main className="app-main">
                <Outlet context={{ refreshTrigger, refresh } satisfies OutletContextType} />
            </main>
        </div>
    )
}
