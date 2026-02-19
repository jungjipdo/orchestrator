// ============================================
// githubApi.ts — GitHub API 레이어
// Supabase에 저장된 access_token으로 GitHub 호출
// ============================================

import { supabase } from '../supabase/client'

// ─── Types ───

export interface GitHubConnection {
    id: string
    user_id: string
    installation_id: number
    github_username: string | null
    access_token: string
    refresh_token: string | null
    token_expires_at: string | null
    connected_at: string
    updated_at: string
}

export interface GitHubRepo {
    id: number
    name: string
    full_name: string
    description: string | null
    html_url: string
    private: boolean
    language: string | null
    default_branch: string
    updated_at: string
    stargazers_count: number
}

export interface GitHubBranch {
    name: string
    protected: boolean
}

// ─── Connection CRUD ───

/** 현재 유저의 GitHub 연결 정보 조회 */
export async function getGitHubConnection(): Promise<GitHubConnection | null> {
    const { data, error } = await supabase
        .from('github_connections')
        .select('*')
        .maybeSingle()

    if (error) throw error
    return data as GitHubConnection | null
}

/** GitHub 연결 해제 */
export async function disconnectGitHub(connectionId: string): Promise<void> {
    const { error } = await supabase
        .from('github_connections')
        .delete()
        .eq('id', connectionId)

    if (error) throw error
}

/**
 * provider_token을 직접 받아서 github_connections 테이블에 upsert.
 * URL hash에서 추출한 provider_token을 인자로 전달.
 */
export async function syncGitHubWithToken(providerToken: string): Promise<GitHubConnection | null> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        console.error('[syncGitHub] Supabase 세션 없음')
        return null
    }

    // GitHub API로 username 조회
    let username: string | null = null
    try {
        const res = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${providerToken}`,
                Accept: 'application/vnd.github+json',
            },
        })
        if (res.ok) {
            const user = await res.json() as { login?: string }
            username = user.login ?? null
            console.log('[syncGitHub] GitHub username:', username)
        } else {
            console.error('[syncGitHub] GitHub /user API 실패:', res.status)
        }
    } catch {
        // username 못 가져와도 연결은 진행
    }

    // github_connections에 upsert
    type GhInsert = { user_id: string; installation_id: number; github_username: string | null; access_token: string; refresh_token: string | null; token_expires_at: string | null }
    const row: GhInsert = {
        user_id: session.user.id,
        installation_id: 0,
        github_username: username,
        access_token: providerToken,
        refresh_token: null,
        token_expires_at: null,
    }
    const { data, error } = await supabase
        .from('github_connections')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single()

    if (error) {
        console.error('[syncGitHub] DB upsert 실패:', error)
        return null
    }
    console.log('[syncGitHub] 연결 저장 성공:', data)
    return data as GitHubConnection
}

// ─── GitHub API 호출 ───

/** GitHub 토큰 만료 에러 */
export class GitHubTokenExpiredError extends Error {
    constructor() {
        super('GitHub 토큰이 만료되었습니다. 재연결이 필요합니다.')
        this.name = 'GitHubTokenExpiredError'
    }
}

async function githubFetch<T>(path: string, token: string): Promise<T> {
    const res = await fetch(`https://api.github.com${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    })

    if (!res.ok) {
        const body = await res.text()

        // 401 — 토큰 만료 → 이벤트 dispatch
        if (res.status === 401) {
            window.dispatchEvent(new CustomEvent('github:token-expired'))
            throw new GitHubTokenExpiredError()
        }

        // 403 — 권한 부족
        if (res.status === 403 && body.includes('Resource not accessible by integration')) {
            throw new Error(
                `프라이빗 레포 접근 권한이 없습니다. GitHub App 설정 → Repository access에서 이 레포를 추가해주세요.\n(Settings → Applications → Orchestrator → Configure → Repository access)`
            )
        }
        throw new Error(`GitHub API ${res.status}: ${body}`)
    }

    return res.json() as Promise<T>
}

/** 연결된 계정의 레포 목록 (개인 + 조직 + 기여한 레포 통합) */
export async function listRepos(token: string): Promise<GitHubRepo[]> {
    // 1) 사용자 개인 레포 (owner, collaborator, org_member)
    const userReposPromise = githubFetch<{ repositories: GitHubRepo[] } | GitHubRepo[]>(
        '/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member',
        token,
    )

    // 2) 사용자의 조직 목록 → 각 조직의 레포 가져오기
    let orgRepos: GitHubRepo[] = []
    try {
        const orgs = await githubFetch<{ login: string }[]>('/user/orgs?per_page=100', token)
        const orgRepoResults = await Promise.allSettled(
            orgs.map(org =>
                githubFetch<GitHubRepo[]>(
                    `/orgs/${org.login}/repos?per_page=100&sort=pushed&type=all`,
                    token,
                )
            )
        )
        for (const result of orgRepoResults) {
            if (result.status === 'fulfilled') {
                orgRepos.push(...result.value)
            }
        }
    } catch {
        console.warn('[listRepos] org repos fetch failed')
    }

    // 3) 사용자가 issue/PR로 기여한 레포 (Search API)
    let contributedRepos: GitHubRepo[] = []
    try {
        // 현재 사용자명 조회
        const user = await githubFetch<{ login: string }>('/user', token)
        if (user.login) {
            // 최근 issue/PR이 있는 레포 검색 (최대 30개)
            const searchResult = await githubFetch<{
                items: { repository_url: string }[]
            }>(`/search/issues?q=involves:${user.login}+is:public&sort=updated&per_page=30`, token)

            // repository_url에서 고유 레포 full_name 추출
            const repoFullNames = new Set<string>()
            for (const item of searchResult.items) {
                // repository_url: "https://api.github.com/repos/owner/repo"
                const match = item.repository_url.match(/\/repos\/(.+)$/)
                if (match) repoFullNames.add(match[1])
            }

            // 각 레포 정보 조회
            const repoResults = await Promise.allSettled(
                Array.from(repoFullNames).map(fullName =>
                    githubFetch<GitHubRepo>(`/repos/${fullName}`, token)
                )
            )
            for (const result of repoResults) {
                if (result.status === 'fulfilled') {
                    contributedRepos.push(result.value)
                }
            }
        }
    } catch {
        console.warn('[listRepos] contributed repos fetch failed')
    }

    const data = await userReposPromise
    const userRepos = Array.isArray(data) ? data : (data.repositories ?? [])

    // 4) 중복 제거 (id 기준) 후 병합
    const seen = new Set<number>()
    const merged: GitHubRepo[] = []
    for (const repo of [...userRepos, ...orgRepos, ...contributedRepos]) {
        if (!seen.has(repo.id)) {
            seen.add(repo.id)
            merged.push(repo)
        }
    }

    return merged
}

/** 특정 레포의 브랜치 목록 */
export async function listBranches(
    token: string,
    owner: string,
    repo: string,
): Promise<GitHubBranch[]> {
    return githubFetch<GitHubBranch[]>(
        `/repos/${owner}/${repo}/branches?per_page=100`,
        token,
    )
}

// ─── README 조회 ───

/** 레포의 README.md 내용 가져오기 (Base64 디코딩) */
export async function getReadme(
    token: string,
    owner: string,
    repo: string,
): Promise<string | null> {
    try {
        const data = await githubFetch<{ content: string; encoding: string }>(
            `/repos/${owner}/${repo}/readme`,
            token,
        )
        if (data.encoding === 'base64') {
            return atob(data.content.replace(/\n/g, ''))
        }
        return data.content
    } catch {
        // README 없는 레포도 있음
        return null
    }
}

// ─── 커밋 상세 조회 ───

interface CommitDetailFile {
    filename: string
    status: string  // 'added' | 'modified' | 'removed'
    additions: number
    deletions: number
}

/** 특정 커밋의 변경 파일 목록 */
export async function getCommitDetail(
    token: string,
    owner: string,
    repo: string,
    sha: string,
): Promise<CommitDetailFile[]> {
    try {
        const data = await githubFetch<{ files?: CommitDetailFile[] }>(
            `/repos/${owner}/${repo}/commits/${sha}`,
            token,
        )
        return data.files ?? []
    } catch {
        return []
    }
}

// ─── NOTE: GitHub OAuth는 supabase.auth.signInWithOAuth()로 처리 ───
// getGitHubInstallUrl()은 더 이상 사용하지 않음

// ─── Issues / PRs / Commits Types ───
// 필요한 GitHub App 권한:
//   - contents: read     (commits, compare)
//   - issues: read       (issues)
//   - pull_requests: read (PRs)
//   - metadata: read     (기본 포함)

export interface GitHubIssue {
    id: number
    number: number
    title: string
    state: 'open' | 'closed'
    user: { login: string; avatar_url: string }
    labels: { name: string; color: string }[]
    created_at: string
    updated_at: string
    pull_request?: { url: string } // PR이면 이 필드 존재
    comments: number
}

export interface GitHubPR {
    id: number
    number: number
    title: string
    state: 'open' | 'closed'
    user: { login: string; avatar_url: string }
    head: { ref: string; sha: string }
    base: { ref: string }
    created_at: string
    updated_at: string
    merged_at: string | null
    draft: boolean
    additions?: number
    deletions?: number
    changed_files?: number
}

export interface GitHubCommit {
    sha: string
    commit: {
        message: string
        author: { name: string; email: string; date: string }
    }
    author: { login: string; avatar_url: string } | null
    html_url: string
}

// ─── Issues / PRs / Commits API ───

/** 레포의 Issues 목록 (PR 제외) */
export async function listIssues(
    token: string,
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
    perPage = 30,
): Promise<GitHubIssue[]> {
    const all = await githubFetch<GitHubIssue[]>(
        `/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}&sort=updated&direction=desc`,
        token,
    )
    // GitHub Issues API는 PR도 포함 → pull_request 필드가 없는 것만 필터
    return all.filter(issue => !issue.pull_request)
}

/** 레포의 Pull Requests 목록 */
export async function listPRs(
    token: string,
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open',
    perPage = 30,
): Promise<GitHubPR[]> {
    return githubFetch<GitHubPR[]>(
        `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}&sort=updated&direction=desc`,
        token,
    )
}

/** 레포의 커밋 히스토리 */
export async function listCommits(
    token: string,
    owner: string,
    repo: string,
    branch?: string,
    perPage = 20,
): Promise<GitHubCommit[]> {
    const sha = branch ? `&sha=${encodeURIComponent(branch)}` : ''
    return githubFetch<GitHubCommit[]>(
        `/repos/${owner}/${repo}/commits?per_page=${perPage}${sha}`,
        token,
    )
}

/** 레포 요약 정보 (open issues/PRs 개수 빠르게 조회) */
export interface RepoStats {
    openIssues: number
    openPRs: number
    recentCommits: GitHubCommit[]
}

export async function getRepoStats(
    token: string,
    owner: string,
    repo: string,
): Promise<RepoStats> {
    // 병렬 호출로 속도 최적화
    const [issues, prs, commits] = await Promise.all([
        listIssues(token, owner, repo, 'open', 1).then(r => r),
        listPRs(token, owner, repo, 'open', 1),
        listCommits(token, owner, repo, undefined, 5),
    ])

    // Issues 총 개수는 GitHub API 헤더에 없으므로, 별도 count 필요
    // per_page=1로 요청하면 배열 길이로 "최소 1개 있음" 정도만 알 수 있음
    // 정확한 count를 위해 per_page=100으로 다시 요청
    const [allIssues, allPRs] = await Promise.all([
        issues.length > 0 ? listIssues(token, owner, repo, 'open', 100) : Promise.resolve([]),
        prs.length > 0 ? listPRs(token, owner, repo, 'open', 100) : Promise.resolve([]),
    ])

    return {
        openIssues: allIssues.length,
        openPRs: allPRs.length,
        recentCommits: commits,
    }
}

