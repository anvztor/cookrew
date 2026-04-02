export type WatchEventType = 'ADDED' | 'MODIFIED' | 'DELETED'

export interface WatchEvent<T = Record<string, unknown>> {
  readonly type: WatchEventType
  readonly resourceType: string
  readonly resourceId: string
  readonly resourceVersion: number
  readonly object: T
  readonly seq: number
}

export interface WatchOptions {
  readonly recipeId?: string
  readonly resourceType?: string
  readonly since?: number
}
