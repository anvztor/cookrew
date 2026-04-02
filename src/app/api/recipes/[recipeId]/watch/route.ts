import { subscribeToRecipeStream } from '@/lib/server/stream-hub'
import {
  getProxySettingsFromRequest,
  hasKrewHubProxy,
} from '@/lib/server/cookrew-data'

interface RouteContext {
  params: Promise<{ recipeId: string }>
}

function streamHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  }
}

/**
 * BFF proxy for the krewhub watch endpoint.
 *
 * When connected to krewhub: proxies GET /api/v1/watch with recipeId
 * and since parameters. Supports replay from last seen seq.
 *
 * In demo mode: wraps the in-memory stream-hub, emitting events in
 * the watch format (type, resourceType, resourceId, seq).
 */
export async function GET(request: Request, context: RouteContext) {
  const { recipeId } = await context.params
  const proxySettings = getProxySettingsFromRequest(request)
  const url = new URL(request.url)
  const since = url.searchParams.get('since') ?? '0'

  if (hasKrewHubProxy(proxySettings)) {
    const baseUrl = proxySettings.baseUrl
    const params = new URLSearchParams({
      recipe_id: recipeId,
      since,
    })

    const upstream = await fetch(`${baseUrl}/api/v1/watch?${params.toString()}`, {
      headers: proxySettings.apiKey
        ? { 'X-API-Key': proxySettings.apiKey }
        : {},
      cache: 'no-store',
    })

    if (!upstream.ok || !upstream.body) {
      return new Response('Unable to connect to watch stream.', { status: 502 })
    }

    return new Response(upstream.body, {
      headers: streamHeaders(),
    })
  }

  // Demo mode: wrap stream-hub in watch event format
  const encoder = new TextEncoder()
  let demoSeq = parseInt(since, 10) || 0
  let cleanup = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToRecipeStream(recipeId, (event, data) => {
        demoSeq++
        const watchEvent = {
          type: 'MODIFIED',
          resourceType: _eventToResourceType(event),
          resourceId: (data as Record<string, unknown>)?.bundle_id
            ?? (data as Record<string, unknown>)?.task_id
            ?? (data as Record<string, unknown>)?.agent_id
            ?? 'unknown',
          resourceVersion: 0,
          object: data,
          seq: demoSeq,
        }
        controller.enqueue(
          encoder.encode(
            `event: ${watchEvent.type}\ndata: ${JSON.stringify(watchEvent)}\n\n`
          )
        )
      })

      const pingId = setInterval(() => {
        controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'))
      }, 15_000)

      cleanup = () => {
        clearInterval(pingId)
        unsubscribe()
      }

      request.signal.addEventListener('abort', cleanup, { once: true })
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: streamHeaders(),
  })
}

function _eventToResourceType(event: string): string {
  if (event.startsWith('bundle.')) return 'bundle'
  if (event.startsWith('task.')) return 'task'
  if (event.startsWith('agent.')) return 'agent'
  if (event.includes('digest')) return 'digest'
  return 'unknown'
}
