import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

const KREW_AUTH_URL = process.env.KREW_AUTH_URL ?? 'http://localhost:8421'
const COOKIE_NAME = 'krew_session'

const sessionKeys = new Hono()

// GET /api/session-keys
sessionKeys.get('/', async (c) => {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) {
    return c.json([], 401)
  }

  const resp = await fetch(
    `${KREW_AUTH_URL}/auth/session-keys/pending?token=${encodeURIComponent(token)}`
  )
  const data = await resp.json()
  return c.json(data, resp.status as 200)
})

// POST /api/session-keys
sessionKeys.post('/', async (c) => {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) {
    return c.json({ detail: 'Not authenticated' }, 401)
  }

  const body = (await c.req.json()) as {
    action: string
    request_id: string
  }

  const endpoint = body.action === 'reject' ? 'reject' : 'confirm'
  const resp = await fetch(
    `${KREW_AUTH_URL}/auth/session-keys/${endpoint}?request_id=${body.request_id}&token=${encodeURIComponent(token)}`,
    { method: 'POST' }
  )
  const data = await resp.json()
  return c.json(data, resp.status as 200)
})

export { sessionKeys }
