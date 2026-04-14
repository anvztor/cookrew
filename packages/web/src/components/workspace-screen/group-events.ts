import type { Event } from '@cookrew/shared'

/**
 * Grouping pass for the workspace event feed.
 *
 * Raw codex/claude hook events are chatty: a single tool call fires
 * BOTH a PreToolUse and a PostToolUse event (+ codex rollout replay
 * can add matching pairs), reasoning blocks arrive one per thought,
 * and SessionStart fires once per turn boundary. Rendering every
 * event as its own card floods the UI with low-signal noise.
 *
 * This pass collapses semantically-related events into groups that
 * the event-card renderer can draw as a single visual unit without
 * losing any of the underlying data — the raw event list stays in
 * krewhub for auditing, we just present it more densely.
 */

export type EventGroup =
  | { kind: 'card'; key: string; event: Event; turn: number; index: number }
  | {
      kind: 'tool-call'
      key: string
      pre: Event | null
      post: Event | null
      turn: number
      index: number
      durationMs: number | null
    }
  | {
      kind: 'thinking'
      key: string
      source: string
      events: readonly Event[]
      turn: number
      index: number
    }
  | {
      kind: 'session-boundary'
      key: string
      event: Event
      turn: number
      index: number
    }
  | {
      kind: 'turn-divider'
      key: string
      turn: number
      index: number
      startedAt: string
      prompt: string
    }

interface GroupContext {
  seenSessionStart: Set<string>
  seenSessionEnd: Set<string>
}

const isHookToolUse = (ev: Event): boolean =>
  ev.actorType === 'hook' && ev.type === 'tool_use'

const hookEventName = (ev: Event): string => {
  const raw = (ev.payload as Record<string, unknown>)?.hook_event_name
  return typeof raw === 'string' ? raw : ''
}

const payloadSource = (ev: Event): string => {
  const raw = (ev.payload as Record<string, unknown>)?._source
  return typeof raw === 'string' ? raw : ''
}

const callId = (ev: Event): string => {
  const payload = ev.payload as Record<string, unknown>
  const codex = payload?._codex_call_id
  if (typeof codex === 'string' && codex) return codex
  const claude = payload?.tool_use_id
  if (typeof claude === 'string' && claude) return claude
  return ''
}

const signature = (ev: Event): string => {
  const payload = ev.payload as Record<string, unknown>
  const tool = payload?.tool_name ?? ''
  const input = payload?.tool_input ?? {}
  try {
    return `${payloadSource(ev)}|${tool}|${JSON.stringify(input)}`
  } catch {
    return `${payloadSource(ev)}|${tool}`
  }
}

const isReasoning = (ev: Event): boolean => {
  if (ev.actorType !== 'hook' || ev.type !== 'agent_reply') return false
  const payload = ev.payload as Record<string, unknown>
  const kind = payload?._codex_kind
  return kind === 'reasoning'
}

const sessionIdOf = (ev: Event): string => {
  const payload = ev.payload as Record<string, unknown>
  const raw = payload?.session_id
  return typeof raw === 'string' ? raw : ''
}

/**
 * Compute a stable fingerprint for an assistant-prose event so that
 * a Notification (agent_reply) and a milestone carrying the same
 * underlying assistant message can be matched.
 *
 * Prefers payload.last_assistant_message (the canonical message
 * shipped by the bridge) and falls back to the body's first 80
 * meaningful chars. Returns '' when there's nothing to fingerprint.
 */
const assistantFingerprint = (ev: Event): string => {
  const payload = ev.payload as Record<string, unknown> | null
  const msg =
    typeof payload?.last_assistant_message === 'string'
      ? (payload.last_assistant_message as string).trim()
      : ''
  if (msg) return msg.slice(0, 80)
  const body = (ev.body || '').trim()
  if (body && body !== 'Notification' && body.length >= 12) {
    return body.slice(0, 80)
  }
  return ''
}

/**
 * Group a flat event list.
 *
 * Algorithm:
 *  - walk in order; keep a pending tool-call (a PreToolUse waiting
 *    for its matching PostToolUse)
 *  - when a PostToolUse arrives that matches the pending Pre (by
 *    call_id or by signature + adjacency), merge them into one card
 *  - consecutive reasoning blocks from the same source collapse into
 *    a single 'thinking' group
 *  - repeat SessionStart/SessionEnd for the same session_id render
 *    as one thin session-boundary divider
 *  - everything else passes through as a 'card'
 */
export function groupEvents(events: readonly Event[]): EventGroup[] {
  const raw: EventGroup[] = []
  const ctx: GroupContext = {
    seenSessionStart: new Set(),
    seenSessionEnd: new Set(),
  }
  const recentAssistantBodies = new Map<string, number>()

  // Pre-pass: find all assistant-prose events that have a `milestone`
  // counterpart with the same fingerprint within 60s. Mark the
  // *non-milestone* duplicate ids as droppable so the milestone
  // (full canonical text) wins. This avoids losing the readable
  // agent:output card when both forms are emitted for the same
  // assistant turn.
  const droppedIds = new Set<string>()
  {
    const milestoneFingerprints: Array<{ fp: string; ts: number }> = []
    for (const ev of events) {
      if (ev.type !== 'milestone') continue
      const fp = assistantFingerprint(ev)
      if (!fp) continue
      milestoneFingerprints.push({
        fp,
        ts: new Date(ev.createdAt).getTime(),
      })
    }
    for (const ev of events) {
      if (ev.type !== 'agent_reply') continue
      const fp = assistantFingerprint(ev)
      if (!fp) continue
      const ts = new Date(ev.createdAt).getTime()
      const matched = milestoneFingerprints.some(
        (m) => m.fp === fp && Math.abs(m.ts - ts) < 60_000
      )
      if (matched) droppedIds.add(ev.id)
    }
  }

  // ---- Pass 1: pair PreToolUse ↔ PostToolUse by call_id (codex
  // _codex_call_id / claude tool_use_id) OR by signature when both
  // sides lack a call_id. Walking forward across non-tool events
  // means reasoning blocks, messages, and prompts that interleave
  // between Pre and Post no longer break the pairing — which the
  // old single-pass algorithm did.
  const pairedPostFor = new Map<number, number>() // pre idx → post idx
  const consumedPost = new Set<number>()
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]
    if (!isHookToolUse(ev) || hookEventName(ev) !== 'PreToolUse') continue
    const preCallId = callId(ev)
    const preSig = signature(ev)
    for (let j = i + 1; j < events.length; j++) {
      if (consumedPost.has(j)) continue
      const cand = events[j]
      if (!isHookToolUse(cand)) continue
      const cName = hookEventName(cand)
      if (cName !== 'PostToolUse' && cName !== 'PostToolUseFailure') continue
      const cCallId = callId(cand)
      const matchById = preCallId && cCallId && preCallId === cCallId
      const matchBySig = !preCallId && !cCallId && signature(cand) === preSig
      if (matchById || matchBySig) {
        pairedPostFor.set(i, j)
        consumedPost.add(j)
        break
      }
    }
  }

  // ---- Pass 2: emit groups in chronological order, anchoring each
  // tool-call pair at the Pre position with the Post's metadata.
  let pendingReasoning: Event[] | null = null
  const flushReasoning = () => {
    if (!pendingReasoning || pendingReasoning.length === 0) return
    const first = pendingReasoning[0]
    raw.push({
      kind: 'thinking',
      key: `think:${first.id}`,
      source: payloadSource(first),
      events: pendingReasoning,
      turn: 0,
      index: 0,
    })
    pendingReasoning = null
  }

  for (let i = 0; i < events.length; i++) {
    const ev = events[i]

    if (isReasoning(ev)) {
      if (!pendingReasoning) pendingReasoning = []
      pendingReasoning.push(ev)
      continue
    }
    if (pendingReasoning) flushReasoning()

    if (isHookToolUse(ev)) {
      const name = hookEventName(ev)
      if (name === 'PreToolUse') {
        const postIdx = pairedPostFor.get(i)
        const post = postIdx !== undefined ? events[postIdx] : null
        raw.push({
          kind: 'tool-call',
          key: `tc:${ev.id}`,
          pre: ev,
          post,
          turn: 0,
          index: 0,
          durationMs: post ? computeDuration(ev, post) : null,
        })
        continue
      }
      if (name === 'PostToolUse' || name === 'PostToolUseFailure') {
        if (consumedPost.has(i)) continue // already emitted via its Pre
        // Orphan Post (no matching Pre): render in place.
        raw.push({
          kind: 'tool-call',
          key: `tc:${ev.id}`,
          pre: null,
          post: ev,
          turn: 0,
          index: 0,
          durationMs: null,
        })
        continue
      }
    }

    if (ev.actorType === 'hook' && ev.type === 'session_start') {
      const sid = sessionIdOf(ev)
      if (sid && ctx.seenSessionStart.has(sid)) continue
      if (sid) ctx.seenSessionStart.add(sid)
      raw.push({
        kind: 'session-boundary',
        key: `sb:${ev.id}`,
        event: ev,
        turn: 0,
        index: 0,
      })
      continue
    }
    if (ev.actorType === 'hook' && ev.type === 'session_end') {
      const sid = sessionIdOf(ev)
      if (sid && ctx.seenSessionEnd.has(sid)) continue
      if (sid) ctx.seenSessionEnd.add(sid)
      raw.push({
        kind: 'session-boundary',
        key: `sb:${ev.id}`,
        event: ev,
        turn: 0,
        index: 0,
      })
      continue
    }

    // Drop pre-pass-marked duplicate (milestone wins).
    if (droppedIds.has(ev.id)) continue

    // Dedup back-to-back assistant prose. Two sources of duplication:
    //  1) codex rollout replay emits an agent_reply Notification AND
    //     the agent posts the same text as a `milestone` (agent:output)
    //  2) two Notification cards with the literal "Notification" body
    //     (until the bridge fix lands) but identical
    //     payload.last_assistant_message
    // We compare on (a) the payload's last_assistant_message if present,
    // otherwise (b) the first 80 chars of the body. Same prefix within
    // 60s = duplicate.
    if (ev.type === 'agent_reply' || ev.type === 'milestone') {
      const payload = ev.payload as Record<string, unknown> | null
      const assistantMsg =
        typeof payload?.last_assistant_message === 'string'
          ? (payload.last_assistant_message as string).trim()
          : ''
      const fallbackBody = (ev.body || '').trim()
      const fingerprint =
        (assistantMsg || (fallbackBody && fallbackBody !== 'Notification' ? fallbackBody : ''))
          .slice(0, 80)
      if (fingerprint.length >= 12) {
        const seenAt = recentAssistantBodies.get(fingerprint)
        const ts = new Date(ev.createdAt).getTime()
        if (seenAt && Math.abs(ts - seenAt) < 60_000) {
          continue
        }
        recentAssistantBodies.set(fingerprint, ts)
      }
    }

    raw.push({
      kind: 'card',
      key: `card:${ev.id}`,
      event: ev,
      turn: 0,
      index: 0,
    })
  }

  if (pendingReasoning) flushReasoning()

  return assignTurnsAndIndices(raw)
}

function computeDuration(pre: Event, post: Event): number | null {
  try {
    const a = new Date(pre.createdAt).getTime()
    const b = new Date(post.createdAt).getTime()
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      return b - a
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Walk grouped events and assign:
 *   - a `turn` number that increments on each UserPromptSubmit card
 *   - a sequential `index` (1-based) for traceability
 * Inserts a `turn-divider` group at the start of each new turn.
 */
function assignTurnsAndIndices(groups: readonly EventGroup[]): EventGroup[] {
  const out: EventGroup[] = []
  let turn = 0
  let index = 0

  for (const g of groups) {
    const isPrompt =
      g.kind === 'card' && g.event.type === 'prompt'
    if (isPrompt) {
      turn += 1
      index += 1
      const promptEv = (g as Extract<EventGroup, { kind: 'card' }>).event
      out.push({
        kind: 'turn-divider',
        key: `td:${promptEv.id}`,
        turn,
        index,
        startedAt: promptEv.createdAt,
        prompt: (promptEv.body || '').trim(),
      })
      // Skip emitting the original prompt card — the divider already
      // shows it. Keeps the feed clean.
      continue
    }
    // First turn implicit: events before any prompt belong to turn 1.
    if (turn === 0) turn = 1
    index += 1
    out.push({ ...g, turn, index } as EventGroup)
  }

  return out
}

/**
 * Filter bucket for the feed filter chips.
 *
 * 'tools' → tool-call groups
 * 'thinking' → reasoning bundles
 * 'sessions' → session-boundary dividers
 * 'messages' → agent_reply cards (non-reasoning) + prompts
 * 'other' → everything else (milestones, plans, fact_added, etc.)
 */
export type FeedBucket = 'tools' | 'thinking' | 'sessions' | 'messages' | 'other'

export function bucketOf(group: EventGroup): FeedBucket {
  if (group.kind === 'tool-call') return 'tools'
  if (group.kind === 'thinking') return 'thinking'
  if (group.kind === 'session-boundary') return 'sessions'
  if (group.kind === 'turn-divider') return 'messages'
  if (group.kind === 'card') {
    const ev = group.event
    if (ev.type === 'agent_reply') return 'messages'
    if (ev.type === 'prompt') return 'messages'
    return 'other'
  }
  return 'other'
}

export interface FeedSummary {
  total: number
  tools: number
  thinking: number
  sessions: number
  messages: number
  other: number
}

export function summarize(groups: readonly EventGroup[]): FeedSummary {
  const s: FeedSummary = {
    total: groups.length,
    tools: 0,
    thinking: 0,
    sessions: 0,
    messages: 0,
    other: 0,
  }
  for (const g of groups) {
    const b = bucketOf(g)
    s[b] += 1
  }
  return s
}
