/**
 * Coalesce a stream of workspace events into a mixed feed of structured
 * singletons and terminal blocks (runs of adjacent `agent_reply` events
 * from the same actor).
 *
 * Why: a streaming CLI agent can emit thousands of stdout lines — one per
 * readline. Rendering each as its own card is unusable. The standard fix
 * in terminals/log UIs (VS Code terminal, GitHub Actions, Buildkite) is
 * to coalesce runs of raw stream events into a single dense block, and
 * break them whenever a "structural" event interrupts the stream.
 *
 * The function is pure and deterministic — given the same ordered
 * event list, it always returns the same groups.
 */
import type { Event } from '@/types'

/** A single structured event that renders as its own card. */
export interface StructuredGroup {
  readonly kind: 'event'
  readonly event: Event
}

/** A run of consecutive agent_reply events from the same actor. */
export interface TerminalGroup {
  readonly kind: 'terminal'
  readonly id: string
  readonly actorId: string
  readonly events: readonly Event[]
  readonly firstCreatedAt: string
  readonly lastCreatedAt: string
  readonly stdoutLines: number
  readonly stderrLines: number
}

export type FeedGroup = StructuredGroup | TerminalGroup

/**
 * Structured event types break the terminal stream. When one of these
 * appears between two runs of agent_reply events, the runs stay separate
 * (you see: terminal → structured card → new terminal).
 */
const STRUCTURAL_TYPES = new Set<Event['type']>([
  'prompt',
  'plan',
  'task_claimed',
  'milestone',
  'fact_added',
  'code_pushed',
  'digest_submitted',
  'digest_approved',
  'digest_rejected',
  'session_start',
  'session_end',
  'tool_use',
  'tool_result',
  'thinking',
])

/** Is this event a terminal-stream event (coalescable)? */
function isStreamEvent(event: Event): boolean {
  if (event.type !== 'agent_reply') return false
  // agent_reply events without a structured payload are from the
  // claude stream's "text block" path — those still render richer
  // (they're model-generated prose, not raw stdout). Only coalesce
  // agent_reply events that came from a stdout/stderr tap.
  if (!event.payload) return true
  if (event.payload.kind !== 'agent_reply') return false
  return event.payload.stream === 'stdout' || event.payload.stream === 'stderr'
}

export function groupEvents(events: readonly Event[]): FeedGroup[] {
  const groups: FeedGroup[] = []
  let current: {
    events: Event[]
    actorId: string
    stdoutLines: number
    stderrLines: number
  } | null = null

  const flush = () => {
    if (!current || current.events.length === 0) return
    const first = current.events[0]
    const last = current.events[current.events.length - 1]
    groups.push({
      kind: 'terminal',
      // Stable id: first event's id covers reconciliation across
      // reorders because subsequent events keep appending.
      id: `term_${first.id}`,
      actorId: current.actorId,
      events: current.events,
      firstCreatedAt: first.createdAt,
      lastCreatedAt: last.createdAt,
      stdoutLines: current.stdoutLines,
      stderrLines: current.stderrLines,
    })
    current = null
  }

  for (const event of events) {
    if (isStreamEvent(event)) {
      // Start a new run if the actor changes (defensive — should be rare).
      if (current && current.actorId !== event.actorId) {
        flush()
      }
      if (!current) {
        current = {
          events: [],
          actorId: event.actorId,
          stdoutLines: 0,
          stderrLines: 0,
        }
      }
      current.events.push(event)
      const stream =
        event.payload?.kind === 'agent_reply' ? event.payload.stream : undefined
      if (stream === 'stderr') {
        current.stderrLines += 1
      } else {
        current.stdoutLines += 1
      }
      continue
    }

    // Structural event — flush any open terminal run and emit a
    // singleton for it.
    flush()
    if (STRUCTURAL_TYPES.has(event.type)) {
      groups.push({ kind: 'event', event })
    } else {
      // Unknown type: still render it as a card so nothing gets hidden.
      groups.push({ kind: 'event', event })
    }
  }

  flush()
  return groups
}
