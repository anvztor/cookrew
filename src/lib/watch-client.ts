'use client'

import type { WatchEvent } from '@/types/watch'

export type WatchCallback = (event: WatchEvent) => void

/**
 * Opens a watch stream via the BFF proxy.
 *
 * Tracks the last seen sequence number so reconnects can replay
 * missed events. Returns a cleanup function.
 *
 * Unlike the old openRecipeStream which listened to named SSE events,
 * this connects to the unified /watch endpoint and receives all
 * resource mutations as typed WatchEvents.
 */
export function openWatchStream(
  recipeId: string,
  onEvent: WatchCallback,
  initialSeq: number = 0
): () => void {
  let lastSeq = initialSeq
  let source: EventSource | null = null
  let closed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    if (closed) return

    const params = new URLSearchParams({
      since: String(lastSeq),
    })
    const url = `/api/recipes/${recipeId}/watch?${params.toString()}`
    source = new EventSource(url)

    source.addEventListener('ADDED', handleMessage)
    source.addEventListener('MODIFIED', handleMessage)
    source.addEventListener('DELETED', handleMessage)
    source.addEventListener('ping', () => {})

    source.onerror = () => {
      if (closed) return
      source?.close()
      source = null
      reconnectTimer = setTimeout(connect, 2000)
    }
  }

  function handleMessage(message: MessageEvent<string>) {
    if (!message.data) return

    try {
      const watchEvent = JSON.parse(message.data) as WatchEvent
      if (watchEvent.seq > lastSeq) {
        lastSeq = watchEvent.seq
      }
      onEvent(watchEvent)
    } catch {
      // ignore malformed events
    }
  }

  connect()

  return () => {
    closed = true
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
    }
    source?.close()
    source = null
  }
}
