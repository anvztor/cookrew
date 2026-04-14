import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

const KREW_AUTH_URL = process.env.KREW_AUTH_URL ?? 'http://localhost:8421'
const COOKIE_NAME = 'krew_session'

const mintOps = new Hono()

// GET /api/mint-ops
mintOps.get('/', async (c) => {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) {
    return c.json([], 401)
  }

  const resp = await fetch(
    `${KREW_AUTH_URL}/auth/mint-ops/pending?token=${encodeURIComponent(token)}`
  )
  return c.json(await resp.json(), resp.status as 200)
})

// POST /api/mint-ops
mintOps.post('/', async (c) => {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) {
    return c.json({ detail: 'Not authenticated' }, 401)
  }

  const body = (await c.req.json()) as {
    action: string
    mint_id: string
    tx_hash?: string
  }

  const resp = await fetch(
    `${KREW_AUTH_URL}/auth/mint-ops/confirm?mint_id=${body.mint_id}&token=${encodeURIComponent(token)}&tx_hash=${body.tx_hash ?? ''}`,
    { method: 'POST' }
  )
  return c.json(await resp.json(), resp.status as 200)
})

export { mintOps }
