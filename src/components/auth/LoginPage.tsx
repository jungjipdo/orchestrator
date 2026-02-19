// ============================================
// LoginPage — GitHub OAuth 로그인 화면
// 글래스모피즘 + 미니멀 디자인
// ============================================

import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Zap, Github, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'

export function LoginPage() {
    const { signInWithGitHub } = useAuth()
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async () => {
        setIsLoading(true)
        try {
            await signInWithGitHub()
        } catch {
            setIsLoading(false)
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{ background: 'var(--body-gradient)' }}
        >
            <div
                className="w-full max-w-sm rounded-2xl border p-8 text-center"
                style={{
                    background: 'var(--glass-bg)',
                    borderColor: 'var(--glass-border)',
                    backdropFilter: `blur(var(--glass-blur))`,
                    WebkitBackdropFilter: `blur(var(--glass-blur))`,
                    boxShadow: 'var(--glass-shadow)',
                }}
            >
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
                        <Zap className="w-9 h-9 text-primary-foreground" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold mb-1">Orchestrator</h1>
                <p className="text-sm text-muted-foreground mb-8">
                    Continuous Development & AI Release Management
                </p>

                {/* Login Button */}
                <Button
                    className="w-full h-12 text-base gap-2"
                    onClick={handleLogin}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Github className="w-5 h-5" />
                    )}
                    GitHub로 로그인
                </Button>

                <p className="text-xs text-muted-foreground mt-6">
                    GitHub 계정으로 안전하게 로그인합니다
                </p>
            </div>
        </div>
    )
}
