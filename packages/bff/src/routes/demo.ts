import { Hono } from 'hono'
import { resetDemoState } from '../lib/demo-store'

const demo = new Hono()

// POST /api/demo/reset
demo.post('/reset', (c) => {
  resetDemoState()
  return c.json({ ok: true })
})

// GET /api/demo/reset (convenience)
demo.get('/reset', (c) => {
  resetDemoState()
  return c.json({ ok: true })
})

export { demo }
