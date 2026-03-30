type StreamListener = (event: string, data: Record<string, unknown>) => void

const recipeListeners = new Map<string, Set<StreamListener>>()

export function subscribeToRecipeStream(
  recipeId: string,
  listener: StreamListener
): () => void {
  const listeners = recipeListeners.get(recipeId) ?? new Set<StreamListener>()
  listeners.add(listener)
  recipeListeners.set(recipeId, listeners)

  return () => {
    const current = recipeListeners.get(recipeId)
    if (!current) {
      return
    }

    current.delete(listener)
    if (current.size === 0) {
      recipeListeners.delete(recipeId)
    }
  }
}

export function publishRecipeStream(
  recipeId: string,
  event: string,
  data: Record<string, unknown>
): void {
  const listeners = recipeListeners.get(recipeId)
  if (!listeners) {
    return
  }

  for (const listener of listeners) {
    listener(event, data)
  }
}
