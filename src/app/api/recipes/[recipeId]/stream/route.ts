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

export async function GET(request: Request, context: RouteContext) {
  const { recipeId } = await context.params
  const proxySettings = getProxySettingsFromRequest(request)

  if (hasKrewHubProxy(proxySettings)) {
    const baseUrl = proxySettings.baseUrl
    const upstream = await fetch(`${baseUrl}/api/v1/recipes/${recipeId}/stream`, {
      headers: proxySettings.apiKey
        ? { 'X-API-Key': proxySettings.apiKey }
        : {},
      cache: 'no-store',
    })

    if (!upstream.ok || !upstream.body) {
      return new Response('Unable to connect to stream.', { status: 502 })
    }

    return new Response(upstream.body, {
      headers: streamHeaders(),
    })
  }

  const encoder = new TextEncoder()
  let cleanup = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeToRecipeStream(recipeId, (event, data) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
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
