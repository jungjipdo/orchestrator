// ============================================
// LandingPage — Antigravity 스타일 초경량 랜딩
// 풀스크린 1페이지, 스크롤 없이 완결
// ============================================

import { useNavigate } from 'react-router'
import { ArrowRight, Download } from 'lucide-react'
import './LandingPage.css'

export function LandingPage() {
    const navigate = useNavigate()

    const handleLaunchApp = () => {
        void navigate('/app')
    }

    return (
        <div className="landing-page">
            {/* Background effects */}
            <div className="landing-bg-glow landing-bg-glow--1" />
            <div className="landing-bg-glow landing-bg-glow--2" />

            {/* Background Image with Transparency */}
            <div className="landing-bg-image-container">
                <img
                    src="/landing-mockup.png"
                    alt="Background Mockup"
                    className="landing-bg-image"
                />
                <div className="landing-bg-overlay" />
            </div>

            {/* Main content */}
            <div className="landing-content">
                <h1 className="landing-title">
                    Orchestrator
                </h1>

                <p className="landing-subtitle">
                    The Control Tower for AI Agents
                </p>

                <p className="landing-description">
                    Continuous release management, intelligent code monitoring,<br className="hidden sm:block" /> and multi-agent orchestration built for vibe coders.
                </p>

                <div className="landing-cta-group">
                    <button
                        type="button"
                        className="landing-cta landing-cta--primary"
                        onClick={handleLaunchApp}
                    >
                        Launch App
                        <ArrowRight className="landing-cta-icon" />
                    </button>

                    <a
                        href="https://github.com/jungjipdo/orchestrator/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="landing-cta landing-cta--secondary"
                    >
                        <Download className="landing-cta-icon" />
                        Download for Mac
                    </a>
                </div>

                {/* Footer */}
                <div className="landing-footer">
                    <span>Open Source</span>
                    <span className="landing-footer-dot">·</span>
                    <a
                        href="https://github.com/jungjipdo/orchestrator"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="landing-footer-link"
                    >
                        GitHub
                    </a>
                </div>
            </div>
        </div>
    )
}
