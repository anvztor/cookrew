import { Hono } from 'hono'
import { subscribeToRecipeStream } from '../lib/stream-hub'
import { hasKrewHubProxy } from '../lib/krewhub-client'
import { getProxySettingsFromContext } from '../middleware/proxy-settings'

const watch = new Hono()

function eventToResourceType(event: string): string {
  if (event.startsWith('bundle.')) return 'bundle'
  if (event.startsWith('task.')) return 'task'
  if (event.startsWith('agent.')) return 'agent'
  if (event.includes('digest')) return 'digest'
  return 'unknown'
}

// GET /api/recipes/:recipeId/watch (SSE)
watch.get('/:recipeId/watch', async (c) => {
  const recipeId = c.req.param('recipeId')
  const proxySettings = getProxySettingsFromContext(c)
  const since = c.req.query('since') ?? '0'

  const streamHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  } as const

  if (hasKrewHubProxy(proxySettings)) {
    const baseUrl = proxySettings.baseUrl
    const params = new URLSearchParams({
      recipe_id: recipeId,
      since,
    })

    const upstream = await fetch(
      `${baseUrl}/api/v1/watch?${params.toString()}`,
      {
        headers: proxySettings.apiKey
          ? { 'X-API-Key': proxySettings.apiKey }
          : {},
      }
    )

    if (!upstream.ok || !upstream.body) {
      return new Response('Unable to connect to watch stream.', {
        status: 502,
      })
    }

    return new Response(upstream.body, { headers: streamHeaders })
  }

  // Demo mode: wrap stream-hub in watch event format
  const encoder = new TextEncoder()
  let demoSeq = parseInt(since, 10) || 0
  let cleanup = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToRecipeStream(
        recipeId,
        (event, data) => {
          demoSeq++
          const watchEvent = {
            type: 'MODIFIED',
            resourceType: eventToResourceType(event),
            resourceId:
              (data as Record<string, unknown>)?.bundle_id ??
              (data as Record<string, unknown>)?.task_id ??
              (data as Record<string, unknown>)?.agent_id ??
              'unknown',
            resourceVersion: 0,
            object: data,
            seq: demoSeq,
          }
          controller.enqueue(
            encoder.encode(
              `event: ${watchEvent.type}\ndata: ${JSON.stringify(watchEvent)}\n\n`
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

export { watch }
