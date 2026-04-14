import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { getApiRouteError } from '../lib/krewhub-client'
import { getCookbookDetailData } from '../lib/cookrew-data'
import { getProxySettingsFromContext } from '../middleware/proxy-settings'

const KREWHUB_URL = process.env.KREWHUB_BASE_URL ?? 'http://localhost:8420'
const COOKIE_NAME = 'krew_session'

const cookbooks = new Hono()

// GET /api/cookbooks/:cookbookId
cookbooks.get('/:cookbookId', async (c) => {
  try {
    const cookbookId = c.req.param('cookbookId')
    const data = await getCookbookDetailData(
      cookbookId,
      getProxySettingsFromContext(c)
    )

    if (!data) {
      return c.json({ error: 'Cookbook not found' }, 404)
    }

    return c.json(data)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to load cookbook')
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

// PATCH /api/cookbooks/:cookbookId/agents/:agentId/mint
cookbooks.patch('/:cookbookId/agents/:agentId/mint', async (c) => {
  const cookbookId = c.req.param('cookbookId')
  const agentId = c.req.param('agentId')

  const token = getCookie(c, COOKIE_NAME)
  if (!token) {
    return c.json({ detail: 'Not logged in' }, 401)
  }

  const body = (await c.req.json()) as {
    tx_hash: string
    token_id?: number
  }

  try {
    const resp = await fetch(
      `${KREWHUB_URL}/api/v1/agents/${encodeURIComponent(agentId)}/mint`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cookbook_id: cookbookId,
          tx_hash: body.tx_hash,
          token_id: body.token_id ?? null,
        }),
      }
    )

    const data = await resp.json().catch(() => ({}))
    return c.json(data, resp.status as 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ detail: `Krewhub error: ${msg}` }, 502)
  }
})

export { cookbooks }
