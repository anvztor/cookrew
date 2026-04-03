'use client'

import { useEffect, useEffectEvent, useRef } from 'react'
import { openWatchStream } from '@/lib/watch-client'
import type { WatchEvent } from '@/types/watch'

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
