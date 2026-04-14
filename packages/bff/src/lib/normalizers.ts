import type {
  AgentPresence,
  Bundle,
  CodeRef,
  Digest,
  Event,
  EventPayload,
  FactRef,
  Recipe,
  RecipeMember,
  Task,
} from '@cookrew/shared'

export type {
  RawAgentPresence,
  RawBundle,
  RawBundleDetailResponse,
  RawCodeRef,
  RawCookbook,
  RawCookbookDetailResponse,
  RawCookbooksResponse,
  RawDigest,
  RawDigestResponse,
  RawDigestTaskResult,
  RawEvent,
  RawFactRef,
  RawRecipe,
  RawRecipeDetailResponse,
  RawRecipeMember,
  RawRecipesResponse,
  RawTask,
} from './raw-types'

import type {
  RawAgentPresence,
  RawBundle,
  RawCodeRef,
  RawDigest,
  RawEvent,
  RawFactRef,
  RawRecipe,
  RawRecipeMember,
  RawTask,
} from './raw-types'

// ── Normalizers ───────────────────────────────────────────────────

export function normalizeRecipe(recipe: RawRecipe): Recipe {
  return {
    id: recipe.id,
    name: recipe.name,
    repoUrl: recipe.repo_url,
    defaultBranch: recipe.default_branch,
    createdBy: recipe.created_by,
    createdAt: recipe.created_at,
    cookbookId: recipe.cookbook_id,
  }
}

export function normalizeMember(member: RawRecipeMember): RecipeMember {
  return {
    id: member.id,
    recipeId: member.recipe_id,
    actorId: member.actor_id,
    actorType: member.actor_type,
    role: member.role,
    joinedAt: member.joined_at,
  }
}

export function normalizeAgent(agent: RawAgentPresence): AgentPresence {
  return {
    agentId: agent.agent_id,
    cookbookId: agent.cookbook_id,
    displayName: agent.display_name,
    capabilities: [...agent.capabilities],
    status: agent.status,
    lastHeartbeatAt: agent.last_heartbeat_at,
    currentTaskId: agent.current_task_id,
    ownerUsername: agent.owner_username ?? null,
    mintTxHash: agent.mint_tx_hash ?? null,
    mintTokenId: agent.mint_token_id ?? null,
  }
}

export function normalizeBundle(bundle: RawBundle): Bundle {
  return {
    id: bundle.id,
    recipeId: bundle.recipe_id,
    prompt: bundle.prompt,
    status: bundle.status,
    createdBy: bundle.created_by,
    createdAt: bundle.created_at,
    claimedAt: bundle.claimed_at,
    cookedAt: bundle.cooked_at,
    digestedAt: bundle.digested_at,
    blockedReason: bundle.blocked_reason,
    graphCode: bundle.graph_code ?? null,
    graphMermaid: bundle.graph_mermaid ?? null,
  }
}

export function normalizeFact(fact: RawFactRef): FactRef {
  return {
    id: fact.id,
    claim: fact.claim,
    sourceUrl: fact.source_url,
    sourceTitle: fact.source_title,
    capturedBy: fact.captured_by,
    confidence: fact.confidence,
  }
}

export function normalizeCodeRef(codeRef: RawCodeRef): CodeRef {
  return {
    repoUrl: codeRef.repo_url,
    branch: codeRef.branch,
    commitSha: codeRef.commit_sha,
    paths: [...codeRef.paths],
  }
}

export function normalizeTask(task: RawTask): Task {
  return {
    id: task.id,
    bundleId: task.bundle_id,
    title: task.title,
    description: task.description,
    status: task.status,
    dependsOnTaskIds: [...task.depends_on_task_ids],
    claimedByAgentId: task.claimed_by_agent_id,
    claimedAt: task.claimed_at,
    completedAt: task.completed_at,
    blockedReason: task.blocked_reason,
    graphNodeId: task.graph_node_id ?? null,
  }
}

export function normalizeEvent(event: RawEvent): Event {
  return {
    id: event.id,
    recipeId: event.recipe_id,
    bundleId: event.bundle_id,
    taskId: event.task_id,
    type: event.type,
    actorId: event.actor_id,
    actorType: event.actor_type,
    body: event.body,
    payload: normalizeEventPayload(event.type, event.payload),
    sequence: event.sequence ?? 0,
    facts: event.facts.map(normalizeFact),
    codeRefs: event.code_refs.map(normalizeCodeRef),
    createdAt: event.created_at,
    expiresAt: event.expires_at,
  }
}

function normalizeEventPayload(
  type: RawEvent['type'],
  raw: Record<string, unknown> | null
): EventPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const str = (key: string): string | undefined => {
    const v = raw[key]
    return typeof v === 'string' ? v : undefined
  }
  const num = (key: string): number | undefined => {
    const v = raw[key]
    return typeof v === 'number' ? v : undefined
  }
  const bool = (key: string): boolean | undefined => {
    const v = raw[key]
    return typeof v === 'boolean' ? v : undefined
  }

  switch (type) {
    case 'session_start':
      return {
        kind: 'session_start',
        agentName: str('agent_name') ?? 'agent',
        model: str('model'),
        cwd: str('cwd'),
        sessionId: str('session_id'),
        tools: Array.isArray(raw.tools)
          ? (raw.tools as unknown[]).filter(
              (t): t is string => typeof t === 'string'
            )
          : undefined,
        prompt: str('prompt'),
      }
    case 'session_end': {
      const rawTokens = raw.tokens
      const tokens =
        rawTokens && typeof rawTokens === 'object'
          ? (rawTokens as Record<string, unknown>)
          : null
      const numField = (
        obj: Record<string, unknown> | null,
        key: string
      ) => {
        if (!obj) return undefined
        const v = obj[key]
        return typeof v === 'number' ? v : undefined
      }
      return {
        kind: 'session_end',
        success: bool('success') ?? false,
        durationMs: num('duration_ms'),
        numTurns: num('num_turns'),
        tokens: tokens
          ? {
              input_tokens: numField(tokens, 'input_tokens'),
              output_tokens: numField(tokens, 'output_tokens'),
              cache_creation_input_tokens: numField(
                tokens,
                'cache_creation_input_tokens'
              ),
              cache_read_input_tokens: numField(
                tokens,
                'cache_read_input_tokens'
              ),
            }
          : undefined,
        costUsd: num('cost_usd'),
        resultText: str('result_text'),
        blockedReason: str('blocked_reason'),
      }
    }
    case 'agent_reply': {
      const streamRaw = str('stream')
      const stream =
        streamRaw === 'stdout' || streamRaw === 'stderr'
          ? streamRaw
          : undefined
      return {
        kind: 'agent_reply',
        text: str('text') ?? '',
        blockIndex: num('block_index') ?? 0,
        model: str('model'),
        stream,
      }
    }
    case 'thinking':
      return {
        kind: 'thinking',
        text: str('text') ?? '',
      }
    case 'tool_use':
      return {
        kind: 'tool_use',
        toolUseId: str('tool_use_id') ?? '',
        toolName: str('tool_name') ?? '',
        input: raw.input ?? null,
      }
    case 'tool_result':
      return {
        kind: 'tool_result',
        toolUseId: str('tool_use_id') ?? '',
        output: str('output') ?? '',
        isError: bool('is_error') ?? false,
      }
    default:
      return null
  }
}

export function normalizeDigest(digest: RawDigest): Digest {
  return {
    id: digest.id,
    recipeId: digest.recipe_id,
    bundleId: digest.bundle_id,
    summary: digest.summary,
    taskResults: digest.task_results.map((result) => ({
      taskId: result.task_id,
      outcome: result.outcome,
    })),
    facts: digest.facts.map(normalizeFact),
    codeRefs: digest.code_refs.map(normalizeCodeRef),
    submittedBy: digest.submitted_by,
    submittedAt: digest.submitted_at,
    decision: digest.decision,
    decidedBy: digest.decided_by,
    decidedAt: digest.decided_at,
  }
}
