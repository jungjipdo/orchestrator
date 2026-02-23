// ============================================
// riskPolicy.ts — 위험도 판정 + 승인 정책
// 경로/내용 기반 자동 분류 + 등급별 게이트 정의
// ============================================

import type { RiskTier } from '../../types/index'

// === 경로 패턴별 위험도 매핑 ===

const HIGH_RISK_PATTERNS = [
    'supabase/migrations/**',
    'src/lib/supabase/**',
    '**/api/**',
    '**/*.sql',
    '**/.env*',
    '**/auth/**',
    '**/middleware*',
]

const LOW_RISK_PATTERNS = [
    '**/*.css',
    '**/*.scss',
    '**/*.md',
    '**/*.txt',
    '**/*.json',
    '**/README*',
    '**/*.svg',
    '**/*.png',
    '**/*.ico',
]

// 나머지는 전부 Mid

// === 간단한 glob 매칭 ===

function matchGlob(path: string, pattern: string): boolean {
    // ** = 모든 경로, * = 단일 세그먼트
    const regex = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '{{DOUBLE}}')
        .replace(/\*/g, '[^/]*')
        .replace(/\{\{DOUBLE\}\}/g, '.*')
    return new RegExp(`^${regex}$`).test(path) || new RegExp(`${regex}$`).test(path)
}

function matchesAny(path: string, patterns: string[]): boolean {
    return patterns.some(p => matchGlob(path, p))
}

// === 위험도 분류 ===

/**
 * 작업 지시 + 영향 경로를 분석하여 위험 등급 자동 분류
 * 가장 높은 위험도가 채택됨 (한 파일이라도 high면 high)
 */
export function classifyRiskTier(
    _instruction: string,
    affectedPaths: string[],
): RiskTier {
    if (affectedPaths.length === 0) return 'mid'

    let highest: RiskTier = 'low'

    for (const path of affectedPaths) {
        if (matchesAny(path, HIGH_RISK_PATTERNS)) {
            return 'high' // 하나라도 high면 즉시 반환
        }
        if (!matchesAny(path, LOW_RISK_PATTERNS)) {
            highest = 'mid' // low 패턴에 안 맞으면 최소 mid
        }
    }

    return highest
}

// === 승인 정책 ===

export interface ApprovalPolicy {
    auto_execute: boolean       // 자동 실행 가능 여부
    approve_before_merge: boolean  // merge 전 승인 필요
    cross_review: boolean       // AI 교차 리뷰 필요
    notify_after: boolean       // 실행 후 알림
}

const APPROVAL_POLICIES: Record<RiskTier, ApprovalPolicy> = {
    low: {
        auto_execute: true,
        approve_before_merge: false,
        cross_review: false,
        notify_after: true,
    },
    mid: {
        auto_execute: true,
        approve_before_merge: true,
        cross_review: false,
        notify_after: true,
    },
    high: {
        auto_execute: false,
        approve_before_merge: true,
        cross_review: true,
        notify_after: true,
    },
}

/**
 * 위험 등급에 따른 승인 정책 반환
 */
export function getApprovalPolicy(tier: RiskTier): ApprovalPolicy {
    return APPROVAL_POLICIES[tier]
}

/**
 * 현재 상태에서 작업 진행 가능 여부 판단
 */
export function canProceed(tier: RiskTier, isApproved: boolean): boolean {
    const policy = getApprovalPolicy(tier)
    if (policy.auto_execute) return true
    return isApproved
}

// === 위험도 메타데이터 ===

export const RISK_TIER_META: Record<RiskTier, { label: string; emoji: string; color: string }> = {
    low: { label: '낮음', emoji: '🟢', color: 'text-green-500' },
    mid: { label: '보통', emoji: '🟡', color: 'text-yellow-500' },
    high: { label: '높음', emoji: '🔴', color: 'text-red-500' },
}
