// ============================================
// Supabase Client (Cloud)
// .env.local에서 URL/Key를 읽어 클라이언트 생성
// ============================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// env가 비어있으면 placeholder로 대체 (런타임 throw 방지)
// 실제 API 호출은 실패하지만 앱이 크래시하지 않음
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder'

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '[Supabase] VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다.\n' +
        '환경변수를 확인하세요. API 호출은 실패합니다.'
    )
}

export const supabase = createClient<Database>(
    supabaseUrl || PLACEHOLDER_URL,
    supabaseAnonKey || PLACEHOLDER_KEY,
    {
        auth: {
            flowType: 'pkce',
        },
    },
)

