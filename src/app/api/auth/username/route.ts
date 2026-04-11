import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const KREW_AUTH_URL = process.env.KREW_AUTH_URL ?? 'http://localhost:8421'
const COOKIE_NAME = 'krew_session'
const COOKIE_MAX_AGE = 60 * 60 * 24

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ detail: 'Not logged in' }, { status: 401 })
  }

  let body: { username?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ detail: 'Invalid request body' }, { status: 400 })
  }

  const { username } = body
  if (!username) {
    return NextResponse.json({ detail: 'Username is required' }, { status: 400 })
  }

  let resp: Response
  try {
    resp = await fetch(`${KREW_AUTH_URL}/auth/username/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username }),
      cache: 'no-store',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { detail: `Cannot reach auth service: ${msg}` },
      { status: 502 },
    )
  }

  let data: Record<string, unknown>
  try {
    data = await resp.json()
  } catch {
    return NextResponse.json(
      { detail: `Auth service returned ${resp.status} (non-JSON)` },
      { status: resp.status >= 400 ? resp.status : 502 },
    )
  }

  if (!resp.ok) {
    return NextResponse.json(data, { status: resp.status })
  }

  // Update cookie with new JWT that includes username
  const response = NextResponse.json({ username: data.username })
  response.cookies.set(COOKIE_NAME, data.token as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })

  return response
}
