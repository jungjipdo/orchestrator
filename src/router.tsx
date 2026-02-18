// ============================================
// Orchestrator — Router Configuration
// React Router v7 — AppLayout이 모든 뷰를 관리
// ============================================

import { createBrowserRouter } from 'react-router'
import { AppLayout } from './components/common/AppLayout'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppLayout />,
        // AppLayout이 Dashboard를 직접 렌더 (사이드바 뷰 전환)
    },
])
