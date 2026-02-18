// ============================================
// github-callback — GitHub App OAuth callback
// code → access_token 교환 후 DB 저장
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const installationId = url.searchParams.get('installation_id')

    // 프론트엔드 리다이렉트 URL (환경변수 or 기본값)
    const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:5175'

    if (!code) {
        return Response.redirect(`${frontendUrl}/?github=error&reason=no_code`, 302)
    }

    const clientId = Deno.env.get('GITHUB_CLIENT_ID')
    const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
        console.error('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET')
        return Response.redirect(`${frontendUrl}/?github=error&reason=config`, 302)
    }

    try {
        // ─── Step 1: code → access_token 교환 ───
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        })

        const tokenData = await tokenRes.json() as {
            access_token?: string
            refresh_token?: string
            expires_in?: number
            error?: string
            error_description?: string
        }

        if (tokenData.error || !tokenData.access_token) {
            console.error('Token exchange failed:', tokenData.error_description ?? tokenData.error)
            return Response.redirect(
                `${frontendUrl}/?github=error&reason=${encodeURIComponent(tokenData.error ?? 'token_failed')}`,
                302,
            )
        }

        // ─── Step 2: access_token으로 유저 정보 조회 ───
        const userRes = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/vnd.github+json',
            },
        })

        const userData = await userRes.json() as { login?: string }
        const githubUsername = userData.login ?? null

        // ─── Step 3: Supabase에 저장 ───
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // token_expires_at 계산
        const tokenExpiresAt = tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null

        // upsert — 같은 installation_id면 업데이트
        const { error: dbError } = await supabase
            .from('github_connections')
            .upsert(
                {
                    installation_id: Number(installationId),
                    github_username: githubUsername,
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token ?? null,
                    token_expires_at: tokenExpiresAt,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'installation_id' },
            )

        if (dbError) {
            console.error('DB save failed:', dbError)
            return Response.redirect(`${frontendUrl}/?github=error&reason=db_save`, 302)
        }

        // ─── Step 4: 프론트엔드로 리다이렉트 ───
        return Response.redirect(`${frontendUrl}/?github=connected`, 302)
    } catch (err) {
        console.error('Unexpected error:', err)
        return Response.redirect(`${frontendUrl}/?github=error&reason=unexpected`, 302)
    }
})
