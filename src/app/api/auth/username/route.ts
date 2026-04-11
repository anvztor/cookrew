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

  const body = await request.json()
  const { username } = body as { username: string }

  const resp = await fetch(`${KREW_AUTH_URL}/auth/username/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, username }),
    cache: 'no-store',
  })

  const data = await resp.json()

  if (!resp.ok) {
    return NextResponse.json(data, { status: resp.status })
  }

  // Update cookie with new JWT that includes username
  const response = NextResponse.json({ username: data.username })
  response.cookies.set(COOKIE_NAME, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })

  return response
}
