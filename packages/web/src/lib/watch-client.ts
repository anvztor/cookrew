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

    // Next.js rewrites buffer SSE responses; connect directly to
    // krewhub when running on cookrew.dev. CORS allows this and
    // withCredentials sends the krew_session cookie.
    const hubBase =
      typeof window !== 'undefined' && window.location.hostname.endsWith('cookrew.dev')
        ? 'https://hub.cookrew.dev'
        : ''
    const url = `${hubBase}/api/v1/watch?${params.toString()}`
    source = new EventSource(url, { withCredentials: true })

    // EventSource delivers named events (`event: foo`) only to listeners
    // registered for that specific name — `onmessage` fires solely for
    // unnamed events. Since the server emits one event name per typed
    // channel (e.g. `event: task:claimed`), we must register a listener
    // for every known channel. Keep in sync with
    // krewhub/services/watch_channels.py.
    const CHANNEL_NAMES = [
      // Task lifecycle
      'task:added', 'task:claimed', 'task:working', 'task:completed',
      'task:failed', 'task:cancelled', 'task:progress',
      'task:message', 'task:session_start', 'task:session_end',
      // Bundle lifecycle
      'bundle:added', 'bundle:prompt', 'bundle:plan', 'bundle:claimed',
      'bundle:cooked', 'bundle:blocked', 'bundle:cancelled', 'bundle:digested',
      // Digest decisions
      'digest:submitted', 'digest:approved', 'digest:rejected',
      // Agent presence
      'agent:added', 'agent:online', 'agent:offline', 'agent:busy',
    ] as const
    for (const name of CHANNEL_NAMES) {
      source.addEventListener(name, handleMessage)
    }

    // Legacy resource event names for backward compat with servers
    // that don't emit the channel field.
    source.onmessage = handleMessage
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
