export type WatchEventType = 'ADDED' | 'MODIFIED' | 'DELETED'

export interface WatchEvent<T = Record<string, unknown>> {
  readonly type: WatchEventType
  readonly resource_type: string
  readonly resource_id: string
  readonly resource_version: number
  readonly object: T
  readonly seq: number
}
