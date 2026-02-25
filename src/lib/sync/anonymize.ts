// ============================================
// anonymize.ts — 데이터 익명화 파이프라인
// Supabase 전송 전 개인정보 제거/해시화
// ============================================

/**
 * SHA-256 해시 생성 (Web Crypto API)
 */
async function sha256(input: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hash = await crypto.subtle.digest('SHA-256', data)
    const bytes = new Uint8Array(hash)
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 파일 경로 해시화
 * /Users/세현/프로젝트/... → a3f8d1b6...
 */
async function hashPath(path: string): Promise<string> {
    if (!path) return ''
    // 확장자만 보존 (분석 가치 있음)
    const ext = path.split('.').pop() ?? ''
    const hashed = await sha256(path)
    return `${hashed.slice(0, 12)}${ext ? '.' + ext : ''}`
}

/**
 * repo_full_name 해시화
 * jungjipdo/orchestrator → 7a8b9c...
 */
async function hashRepoName(repoName: string): Promise<string> {
    if (!repoName) return ''
    return (await sha256(repoName)).slice(0, 16)
}

/**
 * instruction 텍스트에서 키워드만 추출 (원문 제거)
 * "src/components/Dashboard.tsx의 상태 관리를 리팩토링하고 useEffect 최적화"
 * → ["리팩토링", "useEffect", "최적화", "상태", "관리"]
 */
function extractKeywords(text: string): string[] {
    if (!text) return []

    // 1. 파일 경로/URL 제거
    const cleaned = text
        .replace(/[\/\\][\w.\-\/\\]+/g, '') // 파일 경로
        .replace(/https?:\/\/\S+/g, '')      // URL
        .replace(/`[^`]+`/g, '')              // 인라인 코드

    // 2. 프로그래밍 관련 키워드 추출
    const techKeywords = cleaned.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g) ?? [] // PascalCase
    const camelCase = cleaned.match(/\b[a-z]+(?:[A-Z][a-z]+)+\b/g) ?? []          // camelCase

    // 3. 한국어 핵심 단어 (2글자 이상 명사성 단어)
    const koreanWords = cleaned.match(/[가-힣]{2,}/g) ?? []
    const meaningfulKorean = koreanWords.filter(w =>
        !['에서', '으로', '하고', '그리고', '입니다', '합니다', '하세요', '해주세요'].includes(w)
    )

    // 4. 합치기 + 중복 제거
    const all = [...new Set([...techKeywords, ...camelCase, ...meaningfulKorean])]
    return all.slice(0, 10) // 최대 10개
}

/**
 * 익명 사용자 ID 생성 (세션 단위)
 * 실제 user_id 대신 사용
 */
function generateAnonymousId(): string {
    return crypto.randomUUID()
}

// ─── 메인 파이프라인 ───

export interface AnonymizedPayload {
    [key: string]: unknown
}

/**
 * sync_queue의 payload를 익명화하여 Supabase 전송용으로 변환
 */
export async function anonymizePayload(
    tableName: string,
    payload: Record<string, unknown>,
): Promise<AnonymizedPayload> {
    const result = { ...payload }

    // 1. user_id → 익명 UUID
    if ('user_id' in result) {
        result['anonymous_id'] = generateAnonymousId()
        delete result['user_id']
    }

    // 2. 경로 해시화
    for (const key of ['file_path', 'path', 'local_path', 'repo_url']) {
        if (typeof result[key] === 'string') {
            result[key] = await hashPath(result[key] as string)
        }
    }

    // 3. repo_full_name 해시화
    if (typeof result['repo_full_name'] === 'string') {
        result['repo_full_name'] = await hashRepoName(result['repo_full_name'] as string)
    }

    // 4. 테이블별 특화 처리
    if (tableName === 'agent_tasks' || tableName === 'run_results') {
        // instruction → 키워드만
        if (typeof result['instruction'] === 'string') {
            result['instruction_keywords'] = extractKeywords(result['instruction'] as string)
            delete result['instruction']
        }
        // actual_output 제거 (코드 포함 가능성)
        delete result['actual_output']
        delete result['artifacts']
    }

    if (tableName === 'cli_events' || tableName === 'event_logs') {
        // 파일 내용 절대 수집 안 함
        delete result['content']
        delete result['file_content']
        delete result['diff']

        // event detail에서 경로 해시화
        if (result['details'] && typeof result['details'] === 'object') {
            const details = result['details'] as Record<string, unknown>
            if (typeof details['path'] === 'string') {
                details['path'] = await hashPath(details['path'] as string)
            }
            result['details'] = details
        }
    }

    // 5. 민감 필드 일괄 제거
    const sensitiveFields = [
        'access_token', 'refresh_token', 'token_expires_at',
        'github_username', 'email', 'password',
    ]
    for (const field of sensitiveFields) {
        delete result[field]
    }

    return result
}

/**
 * 익명화 + 전송 실패 시 로컬 큐에 재저장하는 래퍼
 * SyncService에서 사용
 */
export async function anonymizeForSync(
    tableName: string,
    payload: Record<string, unknown>,
): Promise<AnonymizedPayload | null> {
    try {
        return await anonymizePayload(tableName, payload)
    } catch (err) {
        console.error('[Anonymize] 파이프라인 실패:', err)
        return null // null이면 SyncService가 스킵
    }
}
