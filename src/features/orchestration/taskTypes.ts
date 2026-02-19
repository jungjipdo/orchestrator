// ============================================
// taskTypes.ts — 작업 타입 10종 정의
// 동작 기반 카테고리 + 기본 AI 모델 매핑
// ============================================

import type { AIModel } from '../../types/index'

// === 작업 타입 ===

export type TaskType =
    | 'code_write'
    | 'refactor'
    | 'testing'
    | 'debug'
    | 'api_dev'
    | 'db_migration'
    | 'security'
    | 'deploy'
    | 'design'
    | 'research_docs'

// === 메타데이터 ===

export interface TaskTypeMeta {
    type: TaskType
    icon: string
    label: string
    description: string
    defaultModel: AIModel
}

export const TASK_TYPES: TaskTypeMeta[] = [
    {
        type: 'code_write',
        icon: '🧑‍💻',
        label: '코드 작성',
        description: '새 기능/페이지/모듈 구현',
        defaultModel: 'claude_sonnet_4_6',
    },
    {
        type: 'refactor',
        icon: '🔧',
        label: '리팩토링',
        description: '기존 코드 구조 개선/정리',
        defaultModel: 'claude_opus_4_6',
    },
    {
        type: 'testing',
        icon: '🧪',
        label: '테스팅',
        description: '단위/통합/E2E 테스트 작성',
        defaultModel: 'gpt_5_3_codex',
    },
    {
        type: 'debug',
        icon: '🐛',
        label: '디버깅',
        description: '버그 분석 및 수정',
        defaultModel: 'gemini_3_deep_think',
    },
    {
        type: 'api_dev',
        icon: '⚙️',
        label: 'API 개발',
        description: '엔드포인트/서버 로직 구현',
        defaultModel: 'claude_sonnet_4_6',
    },
    {
        type: 'db_migration',
        icon: '🗄️',
        label: 'DB 마이그레이션',
        description: '스키마 변경/데이터 이관',
        defaultModel: 'claude_opus_4_6',
    },
    {
        type: 'security',
        icon: '🔒',
        label: '보안/인증',
        description: '인증/권한/보안 감사',
        defaultModel: 'gemini_3_deep_think',
    },
    {
        type: 'deploy',
        icon: '🚀',
        label: '배포/CI',
        description: '빌드/배포/파이프라인 설정',
        defaultModel: 'gpt_5_3_codex',
    },
    {
        type: 'design',
        icon: '🎨',
        label: '디자인 시스템',
        description: 'UI 컴포넌트/디자인 토큰',
        defaultModel: 'claude_sonnet_4_6',
    },
    {
        type: 'research_docs',
        icon: '🔍',
        label: '조사/문서화',
        description: '기술 조사 + 문서 작성',
        defaultModel: 'gemini_3_pro',
    },
]

// === 헬퍼 ===

export function getTaskTypeMeta(type: TaskType): TaskTypeMeta {
    return TASK_TYPES.find(t => t.type === type) ?? TASK_TYPES[0]
}

export function getDefaultModel(type: TaskType): AIModel {
    return getTaskTypeMeta(type).defaultModel
}
