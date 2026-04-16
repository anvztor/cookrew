export type WatchEventType = 'ADDED' | 'MODIFIED' | 'DELETED'

/**
 * Typed watch channels. Derived by the server from resource_type +
 * event_type + status. Enables subscribers to filter by semantic
 * event rather than raw resource mutations.
 */
export type WatchChannel =
  | 'task:added'
  | 'task:claimed'
  | 'task:working'
  | 'task:progress'
  | 'task:completed'
  | 'task:failed'
  | 'task:cancelled'
  | 'task:message'
  | 'task:session_start'
  | 'task:session_end'
  | 'bundle:added'
  | 'bundle:prompt'
  | 'bundle:plan'
  | 'bundle:claimed'
  | 'bundle:cooked'
  | 'bundle:blocked'
  | 'bundle:cancelled'
  | 'bundle:digested'
  | 'digest:submitted'
  | 'digest:approved'
  | 'digest:rejected'
  | 'agent:added'
  | 'agent:online'
  | 'agent:offline'
  | 'agent:busy'
  | (string & {})  // allow forward-compat custom channels

export interface WatchEvent<T = Record<string, unknown>> {
  readonly type: WatchEventType
  readonly resource_type: string
  readonly resource_id: string
  readonly resource_version: number
  readonly object: T
  readonly seq: number
  readonly channel?: WatchChannel
}
