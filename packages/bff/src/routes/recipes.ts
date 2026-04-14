import { Hono } from 'hono'
import { getApiRouteError } from '../lib/krewhub-client'
import {
  createBundle,
  createRecipe,
  getWorkspaceData,
  listCookbookData,
} from '../lib/cookrew-data'
import { getProxySettingsFromContext } from '../middleware/proxy-settings'
import { planTasksFromPrompt } from '../lib/task-planner'
import { subscribeToRecipeStream } from '../lib/stream-hub'
import { hasKrewHubProxy } from '../lib/krewhub-client'
import { getHistoryData } from '../lib/cookrew-data'

const recipes = new Hono()

// GET /api/recipes
recipes.get('/', async (c) => {
  try {
    const data = await listCookbookData(getProxySettingsFromContext(c))
    return c.json(data)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to load recipes')
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

// POST /api/recipes
recipes.post('/', async (c) => {
  try {
    const proxySettings = getProxySettingsFromContext(c)
    const body = (await c.req.json()) as {
      name?: string
      repoUrl?: string
      defaultBranch?: string
      createdBy?: string
      cookbookId?: string
    }

    if (
      !body.name?.trim() ||
      !body.repoUrl?.trim() ||
      !body.createdBy?.trim() ||
      !body.cookbookId?.trim()
    ) {
      return c.json(
        {
          error:
            'Name, repository URL, creator, and cookbook ID are required.',
        },
        400
      )
    }

    const recipe = await createRecipe(
      {
        name: body.name.trim(),
        repoUrl: body.repoUrl.trim(),
        defaultBranch: body.defaultBranch?.trim() || 'main',
        createdBy: body.createdBy.trim(),
        cookbookId: body.cookbookId.trim(),
      },
      proxySettings
    )

    return c.json(recipe, 201)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to create recipe')
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

// GET /api/recipes/:recipeId
recipes.get('/:recipeId', async (c) => {
  try {
    const recipeId = c.req.param('recipeId')
    const bundleId = c.req.query('bundleId') ?? null
    const proxySettings = getProxySettingsFromContext(c)

    const data = await getWorkspaceData(recipeId, bundleId, proxySettings)
    if (!data) {
      return c.json({ error: 'Recipe not found.' }, 404)
    }

    return c.json(data)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to load workspace')
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

// GET /api/recipes/:recipeId/history
recipes.get('/:recipeId/history', async (c) => {
  try {
    const recipeId = c.req.param('recipeId')
    const data = await getHistoryData(
      recipeId,
      getProxySettingsFromContext(c)
    )

    if (!data) {
      return c.json(
        { error: 'Approved digest history was not found.' },
        404
      )
    }

    return c.json(data)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to load history')
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

// POST /api/recipes/:recipeId/plan
recipes.post('/:recipeId/plan', async (c) => {
  try {
    const body = (await c.req.json()) as { prompt?: string }

    if (!body.prompt?.trim()) {
      return c.json({ error: 'Prompt is required.' }, 400)
    }

    const tasks = planTasksFromPrompt(body.prompt.trim())
    return c.json({ tasks })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Planning failed'
    return c.json({ error: message }, 500)
  }
})

// GET /api/recipes/:recipeId/stream (SSE)
recipes.get('/:recipeId/stream', async (c) => {
  const recipeId = c.req.param('recipeId')
  const proxySettings = getProxySettingsFromContext(c)

  const streamHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  } as const

  if (hasKrewHubProxy(proxySettings)) {
    const baseUrl = proxySettings.baseUrl
    const upstream = await fetch(
      `${baseUrl}/api/v1/recipes/${recipeId}/stream`,
      {
        headers: proxySettings.apiKey
          ? { 'X-API-Key': proxySettings.apiKey }
          : {},
      }
    )

    if (!upstream.ok || !upstream.body) {
      return new Response('Unable to connect to stream.', { status: 502 })
    }

    return new Response(upstream.body, { headers: streamHeaders })
  }

  const encoder = new TextEncoder()
  let cleanup = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToRecipeStream(
        recipeId,
        (event, data) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            )
          )
        }
      )

      const pingId = setInterval(() => {
        controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'))
      }, 15_000)

      cleanup = () => {
        clearInterval(pingId)
        unsubscribe()
      }

      c.req.raw.signal.addEventListener('abort', cleanup, { once: true })
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, { headers: streamHeaders })
})

export { recipes }
