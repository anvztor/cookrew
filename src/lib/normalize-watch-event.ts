import type { Event, EventPayload, EventType } from '@/types'

/**
 * Raw event object as delivered by the krewhub watch stream.
 *
 * The SSE proxy passes krewhub JSON through without transformation,
 * so field names arrive in snake_case. This mirrors the server-side
 * RawEvent interface but lives on the client for incremental appends.
 */
interface RawWatchEventObject {
  readonly id: string
  readonly recipe_id: string
  readonly bundle_id: string
  readonly task_id: string | null
  readonly type: EventType
  readonly actor_id: string
  readonly actor_type: Event['actorType']
  readonly body: string
  readonly payload: Record<string, unknown> | null
  readonly sequence: number
  readonly facts: ReadonlyArray<{
    readonly id: string
    readonly claim: string
    readonly source_url: string | null
    readonly source_title: string | null
    readonly captured_by: string
    readonly confidence: number | null
  }>
  readonly code_refs: ReadonlyArray<{
    readonly repo_url: string
    readonly branch: string
    readonly commit_sha: string
    readonly paths: readonly string[]
  }>
  readonly created_at: string
  readonly expires_at: string | null
}

/**
 * Normalize a raw krewhub event (snake_case) from the watch stream
 * into the camelCase Event shape used by the frontend.
 *
 * This duplicates the server-side normalizeEvent logic so we can
 * append events directly from the SSE stream without a full refetch.
 */
export function normalizeWatchEventObject(
  raw: Record<string, unknown>
): Event | null {
  if (!raw.id || !raw.type) return null

  const event = raw as unknown as RawWatchEventObject

  return {
    id: event.id,
    recipeId: event.recipe_id,
    bundleId: event.bundle_id,
    taskId: event.task_id,
    type: event.type,
    actorId: event.actor_id,
    actorType: event.actor_type,
    body: event.body,
    payload: normalizePayload(event.type, event.payload),
    sequence: event.sequence ?? 0,
    facts: (event.facts ?? []).map((f) => ({
      id: f.id,
      claim: f.claim,
      sourceUrl: f.source_url,
      sourceTitle: f.source_title,
      capturedBy: f.captured_by,
      confidence: f.confidence,
    })),
    codeRefs: (event.code_refs ?? []).map((c) => ({
      repoUrl: c.repo_url,
      branch: c.branch,
      commitSha: c.commit_sha,
      paths: c.paths,
    })),
    createdAt: event.created_at,
    expiresAt: event.expires_at,
  } as Event
}

function str(
  raw: Record<string, unknown>,
  key: string
): string | undefined {
  const v = raw[key]
  return typeof v === 'string' ? v : undefined
}

function num(
  raw: Record<string, unknown>,
  key: string
): number | undefined {
  const v = raw[key]
  return typeof v === 'number' ? v : undefined
}

function bool(
  raw: Record<string, unknown>,
  key: string
): boolean | undefined {
  const v = raw[key]
  return typeof v === 'boolean' ? v : undefined
}

function normalizePayload(
  type: EventType,
  raw: Record<string, unknown> | null
): EventPayload | null {
  if (!raw || typeof raw !== 'object') return null

  switch (type) {
    case 'session_start':
      return {
        kind: 'session_start',
        agentName: str(raw, 'agent_name') ?? 'agent',
        model: str(raw, 'model'),
        cwd: str(raw, 'cwd'),
        sessionId: str(raw, 'session_id'),
        tools: Array.isArray(raw.tools)
          ? (raw.tools as unknown[]).filter(
              (t): t is string => typeof t === 'string'
            )
          : undefined,
        prompt: str(raw, 'prompt'),
      }
    case 'session_end': {
      const rawTokens = raw.tokens
      const tokens =
        rawTokens && typeof rawTokens === 'object'
          ? (rawTokens as Record<string, unknown>)
          : null
      const tokenNum = (
        obj: Record<string, unknown> | null,
        key: string
      ) => {
        if (!obj) return undefined
        const v = obj[key]
        return typeof v === 'number' ? v : undefined
      }
      return {
        kind: 'session_end',
        success: bool(raw, 'success') ?? false,
        durationMs: num(raw, 'duration_ms'),
        numTurns: num(raw, 'num_turns'),
        tokens: tokens
          ? {
              input_tokens: tokenNum(tokens, 'input_tokens'),
              output_tokens: tokenNum(tokens, 'output_tokens'),
              cache_creation_input_tokens: tokenNum(
                tokens,
                'cache_creation_input_tokens'
              ),
              cache_read_input_tokens: tokenNum(
                tokens,
                'cache_read_input_tokens'
              ),
            }
          : undefined,
        costUsd: num(raw, 'cost_usd'),
        resultText: str(raw, 'result_text'),
        blockedReason: str(raw, 'blocked_reason'),
      }
    }
    case 'agent_reply': {
      const streamRaw = str(raw, 'stream')
      const stream =
        streamRaw === 'stdout' || streamRaw === 'stderr'
          ? streamRaw
          : undefined
      return {
        kind: 'agent_reply',
        text: str(raw, 'text') ?? '',
        blockIndex: num(raw, 'block_index') ?? 0,
        model: str(raw, 'model'),
        stream,
      }
    }
    case 'thinking':
      return {
        kind: 'thinking',
        text: str(raw, 'text') ?? '',
      }
    case 'tool_use':
      return {
        kind: 'tool_use',
        toolUseId: str(raw, 'tool_use_id') ?? '',
        toolName: str(raw, 'tool_name') ?? '',
        input: raw.input ?? null,
      }
    case 'tool_result':
      return {
        kind: 'tool_result',
        toolUseId: str(raw, 'tool_use_id') ?? '',
        output: str(raw, 'output') ?? '',
        isError: bool(raw, 'is_error') ?? false,
      }
    default:
      return null
  }
}
