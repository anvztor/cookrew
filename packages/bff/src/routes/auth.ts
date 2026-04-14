import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { decodeSessionClaims } from '../middleware/auth-cookie'

const KREW_AUTH_URL = process.env.KREW_AUTH_URL ?? 'http://localhost:8421'
const COOKIE_NAME = 'krew_session'
const COOKIE_MAX_AGE = 60 * 60 * 24
const REDIRECT_URI =
  process.env.KREW_AUTH_REDIRECT_URI ?? 'http://localhost:3000/auth/callback'
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:3000'

const auth = new Hono()

// GET /api/auth/me
auth.get('/me', (c) => {
  const token = getCookie(c, COOKIE_NAME)

  if (!token) {
    return c.json({ authenticated: false }, 401)
  }

  const claims = decodeSessionClaims(token)
  if (!claims) {
    deleteCookie(c, COOKIE_NAME)
    return c.json({ authenticated: false }, 401)
  }

  return c.json({
    authenticated: true,
    account_id: claims.sub,
    wallet_address: claims.wallet,
    auth_method: claims.method,
    username: claims.username,
  })
})

// DELETE /api/auth/me
auth.delete('/me', (c) => {
  deleteCookie(c, COOKIE_NAME)
  return c.json({ ok: true })
})

// POST /api/auth/username
auth.post('/username', async (c) => {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) {
    return c.json({ detail: 'Not logged in' }, 401)
  }

  let body: { username?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ detail: 'Invalid request body' }, 400)
  }

  const { username } = body
  if (!username) {
    return c.json({ detail: 'Username is required' }, 400)
  }

  let resp: Response
  try {
    resp = await fetch(`${KREW_AUTH_URL}/auth/username/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.json(
      { detail: `Cannot reach auth service: ${msg}` },
      502
    )
  }

  let data: Record<string, unknown>
  try {
    data = (await resp.json()) as Record<string, unknown>
  } catch {
    return c.json(
      {
        detail: `Auth service returned ${resp.status} (non-JSON)`,
      },
      (resp.status >= 400 ? resp.status : 502) as 502
    )
  }

  if (!resp.ok) {
    return c.json(data, resp.status as 400)
  }

  // Update cookie with new JWT that includes username
  setCookie(c, COOKIE_NAME, data.token as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })

  return c.json({ username: data.username })
})

// GET /auth/callback
auth.get('/callback', async (c) => {
  const code = c.req.query('code')

  if (!code) {
    return c.redirect(`${APP_ORIGIN}/`)
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
  })

  if (!tokenResp.ok) {
    return c.redirect(`${APP_ORIGIN}/?auth_error=code_exchange_failed`)
  }

  const data = (await tokenResp.json()) as { access_token: string }

  setCookie(c, COOKIE_NAME, data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })

  return c.redirect(`${APP_ORIGIN}/`)
})

export { auth }
