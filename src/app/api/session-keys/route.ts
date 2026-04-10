import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const KREW_AUTH_URL = process.env.KREW_AUTH_URL ?? 'http://localhost:8421'
const COOKIE_NAME = 'krew_session'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json([], { status: 401 })

  const resp = await fetch(
    `${KREW_AUTH_URL}/auth/session-keys/pending?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' }
  )
  const data = await resp.json()
  return NextResponse.json(data, { status: resp.status })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { action, request_id } = body as { action: string; request_id: string }

  const endpoint = action === 'reject' ? 'reject' : 'confirm'
  const resp = await fetch(
    `${KREW_AUTH_URL}/auth/session-keys/${endpoint}?request_id=${request_id}&token=${encodeURIComponent(token)}`,
    { method: 'POST', cache: 'no-store' }
  )
  const data = await resp.json()
  return NextResponse.json(data, { status: resp.status })
}
