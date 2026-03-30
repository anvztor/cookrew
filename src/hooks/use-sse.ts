'use client'

import { useEffect, useEffectEvent } from 'react'
import { openRecipeStream } from '@/lib/sse'
import type { StreamEventPayload } from '@/types'

export function useRecipeStream(
  recipeId: string | null,
  onEvent: (payload: StreamEventPayload) => void
) {
  const handleEvent = useEffectEvent(onEvent)

  useEffect(() => {
    if (!recipeId) {
      return
    }

    return openRecipeStream(recipeId, handleEvent)
  }, [recipeId])
}
