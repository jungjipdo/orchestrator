// ============================================
// auth.ts — 현재 인증 유저 ID 헬퍼
// ============================================

import { supabase } from './client'

/** 현재 로그인된 유저의 ID를 반환. 미인증이면 에러 throw */
export async function requireUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('인증이 필요합니다. 다시 로그인해주세요.')
    return user.id
}
