// ============================================
// isTauri — Tauri 환경 감지 유틸 (통일)
// 프로젝트 전체에서 이 함수만 사용할 것
// ============================================

/**
 * Tauri 데스크탑 환경인지 판별.
 * `__TAURI_INTERNALS__`가 공식 v2 방식.
 */
export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
