// ============================================
// Orchestrator — Router Configuration
// React Router v7 — 단일 화면(대시보드) + 확장 가능 구조
// ============================================

import { createBrowserRouter } from 'react-router'
import { AppLayout } from './components/common/AppLayout'
import { Dashboard } from './components/dashboard/Dashboard'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppLayout />,
        children: [
            {
                index: true,
                element: <Dashboard />,
            },
            // 추후 라우트 추가:
            // { path: 'review', element: <ReviewPage /> },
            // { path: 'settings', element: <SettingsPage /> },
        ],
    },
])
