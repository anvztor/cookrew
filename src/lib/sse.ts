'use client'

import type { StreamEventPayload } from '@/types'

const STREAM_EVENTS = [
  'bundle.created',
  'task.claimed',
  'task.updated',
  'bundle.digest_submitted',
  'bundle.decision',
  'agent.presence',
  'ping',
] as const

export function openRecipeStream(
  recipeId: string,
  onEvent: (payload: StreamEventPayload) => void
): () => void {
  const source = new EventSource(`/api/recipes/${recipeId}/stream`)

  const unsubs = STREAM_EVENTS.map((event) => {
    const listener = (message: MessageEvent<string>) => {
      if (event === 'ping') {
        return
      }

      let data: Record<string, unknown> | null = null
      if (message.data) {
        data = JSON.parse(message.data) as Record<string, unknown>
      }

      onEvent({
        event,
        data,
      })
    }

    source.addEventListener(event, listener)
    return () => source.removeEventListener(event, listener)
  })

  return () => {
    for (const unsubscribe of unsubs) {
      unsubscribe()
    }
    source.close()
  }
}
