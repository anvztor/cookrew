import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const KREW_AUTH_URL = process.env.KREW_AUTH_URL ?? 'http://localhost:8421'
const COOKIE_NAME = 'krew_session'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json([], { status: 401 })

  const resp = await fetch(
    `${KREW_AUTH_URL}/auth/mint-ops/pending?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' }
  )
  return NextResponse.json(await resp.json(), { status: resp.status })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { action, mint_id, tx_hash } = body as { action: string; mint_id: string; tx_hash?: string }

  const resp = await fetch(
    `${KREW_AUTH_URL}/auth/mint-ops/confirm?mint_id=${mint_id}&token=${encodeURIComponent(token)}&tx_hash=${tx_hash ?? ''}`,
    { method: 'POST', cache: 'no-store' }
  )
  return NextResponse.json(await resp.json(), { status: resp.status })
}
