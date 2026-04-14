import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { recipes } from './routes/recipes'
import { bundles } from './routes/bundles'
import { cookbooks } from './routes/cookbooks'
import { auth } from './routes/auth'
import { sessionKeys } from './routes/session-keys'
import { mintOps } from './routes/mint-ops'
import { watch } from './routes/watch'
import { demo } from './routes/demo'

const APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:3000'
const PORT = Number(process.env.PORT ?? 3001)

const app = new Hono()

// ── CORS ──────────────────────────────────────────────────────────

app.use(
  '/*',
  cors({
    origin: APP_ORIGIN,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// ── Routes ────────────────────────────────────────────────────────

// Recipe routes: GET/POST /api/recipes, GET /api/recipes/:id, history, plan, stream
app.route('/api/recipes', recipes)

// Bundle routes: POST bundles, GET/POST digest, POST decision, POST rerun
// Mounted under /api/recipes so the path includes :recipeId
app.route('/api/recipes', bundles)

// Watch route: GET /api/recipes/:recipeId/watch
app.route('/api/recipes', watch)

// Cookbook routes: GET /api/cookbooks/:id, PATCH agent mint
app.route('/api/cookbooks', cookbooks)

// Auth routes: GET/DELETE /api/auth/me, POST /api/auth/username, GET /auth/callback
app.route('/api/auth', auth)
app.route('/auth', auth)

// Session keys: GET/POST /api/session-keys
app.route('/api/session-keys', sessionKeys)

// Mint ops: GET/POST /api/mint-ops
app.route('/api/mint-ops', mintOps)

// Demo: POST/GET /api/demo/reset
app.route('/api/demo', demo)

// ── Health check ──────────────────────────────────────────────────

app.get('/health', (c) => c.json({ status: 'ok' }))

// ── Start ─────────────────────────────────────────────────────────

export default {
  port: PORT,
  fetch: app.fetch,
}
