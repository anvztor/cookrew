import { NextResponse } from 'next/server'

const KREW_AUTH_URL = process.env.KREW_AUTH_URL ?? 'http://localhost:8421'
const COOKIE_NAME = 'krew_session'
const COOKIE_MAX_AGE = 60 * 60 * 24
const REDIRECT_URI = process.env.KREW_AUTH_REDIRECT_URI ?? 'http://localhost:3000/auth/callback'

// Where to redirect after successful login — must match the user's browser origin
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:3000'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${APP_ORIGIN}/`)
  }

  const tokenResp = await fetch(`${KREW_AUTH_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: 'cookrew',
    }),
    cache: 'no-store',
  })

  if (!tokenResp.ok) {
    const detail = await tokenResp.text().catch(() => 'unknown')
    console.error('Code exchange failed:', tokenResp.status, detail)
    return NextResponse.redirect(`${APP_ORIGIN}/?auth_error=code_exchange_failed`)
  }

  const data = await tokenResp.json()

  // Redirect to the user's browser origin (localhost, not 0.0.0.0)
  const response = NextResponse.redirect(`${APP_ORIGIN}/`)
  response.cookies.set(COOKIE_NAME, data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })

  return response
}
