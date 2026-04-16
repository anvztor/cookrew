'use client'

import type { WatchEvent } from '@cookrew/shared'


export type WatchCallback = (event: WatchEvent) => void

export interface WatchStreamOptions {
  recipeId?: string
  initialSeq?: number
  /**
   * Channel filter: comma-separated list of channel prefixes.
   * Supports trailing wildcard. Example: "task:*,digest:submitted".
   * When provided, the server only sends events matching these channels.
   */
  channels?: string | string[]
}

/**
 * Opens a watch stream via the BFF proxy.
 *
 * Tracks the last seen sequence number so reconnects can replay
 * missed events. Returns a cleanup function.
 *
 * Supports typed channel filtering (e.g. `task:*`, `digest:submitted`)
 * via the `channels` option — the server filters server-side so the
 * client doesn't have to.
 */
export function openWatchStream(
  recipeIdOrOptions: string | WatchStreamOptions,
  onEvent: WatchCallback,
  initialSeq: number = 0
): () => void {
  // Backward-compatible: (recipeId, onEvent, initialSeq)
  // New form: (options, onEvent)
  const opts: WatchStreamOptions =
    typeof recipeIdOrOptions === 'string'
      ? { recipeId: recipeIdOrOptions, initialSeq }
      : recipeIdOrOptions

  let lastSeq = opts.initialSeq ?? 0
  let source: EventSource | null = null
  let closed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const channelFilter = Array.isArray(opts.channels)
    ? opts.channels.join(',')
    : opts.channels ?? ''

  function connect() {
    if (closed) return

    const params = new URLSearchParams({ since: String(lastSeq) })
    if (opts.recipeId) params.set('recipe_id', opts.recipeId)
    if (channelFilter) params.set('channel', channelFilter)

    const url = `/api/v1/watch?${params.toString()}`
    // withCredentials=true sends the krew_session cookie through the
    // Next.js rewrite proxy to krewhub. Required for browser auth.
    source = new EventSource(url, { withCredentials: true })

    // Listen for all channel event names, plus the legacy resource
    // event types for backward compat with servers that don't emit
    // the channel field.
    source.onmessage = handleMessage
    source.addEventListener('ADDED', handleMessage)
    source.addEventListener('MODIFIED', handleMessage)
    source.addEventListener('DELETED', handleMessage)
    source.addEventListener('ping', () => {})
    // Wildcard: listen for any typed channel via a generic handler.
    // EventSource doesn't support wildcards natively, but any named
    // event with registered listener fires. We catch all via onmessage
    // above when `event:` header is missing; otherwise known names work.

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
