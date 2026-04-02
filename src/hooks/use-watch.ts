'use client'

import { useEffect, useEffectEvent, useRef } from 'react'
import { openWatchStream } from '@/lib/watch-client'
import type { WatchEvent } from '@/types/watch'
import type { StreamEventPayload } from '@/types'

/**
 * Watch hook that connects to krewhub's watch stream via the BFF proxy.
 *
 * Tracks the last seen sequence number in a ref so reconnects
 * resume from where they left off — no missed events.
 *
 * Provides the same callback signature as the old useRecipeStream
 * for backward compatibility with consumers that just trigger a reload.
 */
export function useWatch(
  recipeId: string | null,
  onEvent: (event: WatchEvent) => void
) {
  const handleEvent = useEffectEvent(onEvent)
  const lastSeqRef = useRef(0)

  useEffect(() => {
    if (!recipeId) return

    return openWatchStream(recipeId, (event) => {
      if (event.seq > lastSeqRef.current) {
        lastSeqRef.current = event.seq
      }
      handleEvent(event)
    }, lastSeqRef.current)
  }, [recipeId])
}

/**
 * Drop-in replacement for useRecipeStream that uses the watch stream
 * internally but exposes the same StreamEventPayload callback.
 *
 * This allows gradual migration: components switch import from
 * use-sse to use-watch without changing their callback signature.
 */
export function useWatchCompat(
  recipeId: string | null,
  onEvent: (payload: StreamEventPayload) => void
) {
  const handleEvent = useEffectEvent(onEvent)

  useWatch(recipeId, (watchEvent) => {
    handleEvent({
      event: _toLegacyEventName(watchEvent),
      data: watchEvent.object as Record<string, unknown> | null,
    })
  })
}

function _toLegacyEventName(event: WatchEvent): string {
  const map: Record<string, Record<string, string>> = {
    bundle: { ADDED: 'bundle.created', MODIFIED: 'bundle.decision' },
    task: { ADDED: 'task.updated', MODIFIED: 'task.updated' },
    digest: { ADDED: 'bundle.digest_submitted', MODIFIED: 'bundle.decision' },
    agent: { MODIFIED: 'agent.presence' },
  }

  return map[event.resourceType]?.[event.type] ?? `${event.resourceType}.${event.type.toLowerCase()}`
}
