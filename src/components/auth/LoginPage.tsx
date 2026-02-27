// ============================================
// LoginPage — GitHub OAuth 로그인 화면
// 글래스모피즘 + 미니멀 디자인
// ============================================

import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Zap, Github, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '../ui/button'

/** Tauri 환경 감지 */
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

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
            className="min-h-screen flex items-center justify-center px-4 relative"
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

            {/* Tauri 전용: 브라우저 인증 대기 오버레이 */}
            {isLoading && isTauri() && (
                <div
                    className="absolute inset-0 flex items-center justify-center z-50"
                    style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                    }}
                >
                    <div className="text-center text-white space-y-4">
                        <ExternalLink className="w-10 h-10 mx-auto animate-pulse" />
                        <p className="text-lg font-semibold">브라우저에서 인증 중...</p>
                        <p className="text-sm opacity-70">GitHub 로그인을 완료하면 자동으로 돌아옵니다</p>
                        <button
                            type="button"
                            onClick={() => setIsLoading(false)}
                            className="mt-4 text-xs opacity-50 hover:opacity-100 underline cursor-pointer"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
