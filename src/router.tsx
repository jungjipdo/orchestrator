// ============================================
// Orchestrator — Router Configuration
// React Router v7 — Landing + AuthGuard + App
// ============================================

import { createBrowserRouter } from 'react-router'
import { LandingGuard } from './components/landing/LandingGuard'
import { AuthGuard } from './components/auth/AuthGuard'
import { AppLayout } from './components/common/AppLayout'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <LandingGuard />,
    },
    {
        path: '/app',
        element: (
            <AuthGuard>
                <AppLayout />
            </AuthGuard>
        ),
    },
])
