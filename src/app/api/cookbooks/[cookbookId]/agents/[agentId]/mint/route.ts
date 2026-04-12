import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const KREWHUB_URL = process.env.KREWHUB_BASE_URL ?? 'http://localhost:8420'
const COOKIE_NAME = 'krew_session'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cookbookId: string; agentId: string }> }
) {
  const { cookbookId, agentId } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ detail: 'Not logged in' }, { status: 401 })
  }

  const body = await request.json() as { tx_hash: string; token_id?: number }

  try {
    const resp = await fetch(
      `${KREWHUB_URL}/api/v1/agents/${encodeURIComponent(agentId)}/mint`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cookbook_id: cookbookId,
          tx_hash: body.tx_hash,
          token_id: body.token_id ?? null,
        }),
        cache: 'no-store',
      },
    )

    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ detail: `Krewhub error: ${msg}` }, { status: 502 })
  }
}
