// ============================================
// lib/tauri/openExternal.ts — Tauri 환경 감지 + 외부 브라우저 OAuth
// 배포 기준: PKCE + 로컬 콜백 서버
// ============================================

/**
 * Tauri 환경인지 감지
 */
export function isTauri(): boolean {
    return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window)
}

/**
 * 외부 브라우저에서 URL 열기
 */
export async function openInExternalBrowser(url: string): Promise<void> {
    if (isTauri()) {
        const { openUrl } = await import('@tauri-apps/plugin-opener')
        await openUrl(url)
    } else {
        window.open(url, '_self')
    }
}

/**
 * Tauri OAuth 콜백 서버 시작 → callback URL 반환
 * Rust 백엔드에서 127.0.0.1:랜덤포트 에 서버 띄움
 */
export async function startOAuthServer(): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<string>('start_oauth_server')
}

/**
 * Tauri 이벤트 리스너 — Rust에서 OAuth code를 받으면 콜백
 * 한 번만 수신하고 자동 해제
 */
export function onOAuthCallback(callback: (code: string) => void): () => void {
    let unlisten: (() => void) | null = null

    import('@tauri-apps/api/event').then(({ listen }) => {
        listen<string>('oauth-callback', (event) => {
            callback(event.payload)
            if (unlisten) unlisten()
        }).then((fn) => {
            unlisten = fn
        })
    })

    return () => {
        if (unlisten) unlisten()
    }
}
