// ============================================
// Supabase Client (Cloud)
// .env.local에서 URL/Key를 읽어 클라이언트 생성
// ============================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '[Supabase] VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다.\n' +
        '.env.local 파일을 확인하세요.'
    )
}

export const supabase = createClient<Database>(
    supabaseUrl ?? '',
    supabaseAnonKey ?? '',
)
