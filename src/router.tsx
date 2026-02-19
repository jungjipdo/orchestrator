// ============================================
// Orchestrator — Router Configuration
// React Router v7 — AuthGuard + AppLayout
// ============================================

import { createBrowserRouter } from 'react-router'
import { AuthGuard } from './components/auth/AuthGuard'
import { AppLayout } from './components/common/AppLayout'

export const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <AuthGuard>
                <AppLayout />
            </AuthGuard>
        ),
    },
])
