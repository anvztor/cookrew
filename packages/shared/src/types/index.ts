export type Role = 'owner' | 'member' | 'agent'

export type BundleStatus =
  | 'open'
  | 'claimed'
  | 'cooked'
  | 'blocked'
  | 'cancelled'
  | 'digested'
  | 'rejected'

export type TaskStatus =
  | 'open'
  | 'claimed'
  | 'working'
  | 'done'
  | 'blocked'
  | 'cancelled'

export type EventType =
  | 'prompt'
  | 'plan'
  | 'task_claimed'
  | 'task_working'
  | 'milestone'
  | 'fact_added'
  | 'code_pushed'
  | 'digest_submitted'
  | 'digest_approved'
  | 'digest_rejected'
  | 'session_start'
  | 'session_end'
  | 'tool_use'
  | 'tool_result'
  | 'agent_reply'
  | 'thinking'

export interface TokenUsage {
  readonly input_tokens?: number
  readonly output_tokens?: number
  readonly cache_creation_input_tokens?: number
  readonly cache_read_input_tokens?: number
}

export type EventPayload =
  | {
      readonly kind: 'session_start'
      readonly agent_name: string
      readonly model?: string
      readonly cwd?: string
      readonly session_id?: string
      readonly tools?: readonly string[]
      readonly prompt?: string
    }
  | {
      readonly kind: 'agent_reply'
      readonly text: string
      readonly block_index: number
      readonly model?: string
      readonly stream?: 'stdout' | 'stderr'
    }
  | {
      readonly kind: 'thinking'
      readonly text: string
    }
  | {
      readonly kind: 'tool_use'
      readonly tool_use_id: string
      readonly tool_name: string
      readonly input: unknown
    }
  | {
      readonly kind: 'tool_result'
      readonly tool_use_id: string
      readonly output: string
      readonly is_error: boolean
    }
  | {
      readonly kind: 'session_end'
      readonly success: boolean
      readonly duration_ms?: number
      readonly num_turns?: number
      readonly tokens?: TokenUsage
      readonly cost_usd?: number
      readonly result_text?: string
      readonly blocked_reason?: string
    }

export type AgentStatus = 'online' | 'offline' | 'busy'

export type ActorType = 'human' | 'agent' | 'system' | 'hook'

export type DigestDecision = 'pending' | 'approved' | 'rejected'

export interface Cookbook {
  readonly id: string
  readonly name: string
  readonly owner_id: string
  readonly created_at: string
}

export interface Recipe {
  readonly id: string
  readonly name: string
  readonly repo_url: string
  readonly default_branch: string
  readonly created_by: string
  readonly created_at: string
  readonly cookbook_id: string
}

export interface RecipeMember {
  readonly id: string
  readonly recipe_id: string
  readonly actor_id: string
  readonly actor_type: 'human' | 'agent'
  readonly role: Role
  readonly joined_at: string
}

export interface AgentPresence {
  readonly agent_id: string
  readonly cookbook_id: string
  readonly display_name: string
  readonly capabilities: readonly string[]
  readonly status: AgentStatus
  readonly last_heartbeat_at: string
  readonly current_task_id: string | null
  readonly owner_username: string | null
  readonly mint_tx_hash: string | null
  readonly mint_token_id: number | null
}

export interface Bundle {
  readonly id: string
  readonly recipe_id: string
  readonly prompt: string
  readonly status: BundleStatus
  readonly created_by: string
  readonly created_at: string
  readonly claimed_at: string | null
  readonly cooked_at: string | null
  readonly digested_at: string | null
  readonly blocked_reason: string | null
  /** Validated pydantic-graph source attached by the planner. Null until
   *  the planner POSTs back to /bundles/{id}/graph. */
  readonly graph_code: string | null
  /** Mermaid flowchart rendered from the validated graph. Null until
   *  the bundle has graph_code attached. */
  readonly graph_mermaid: string | null
}

export interface Task {
  readonly id: string
  readonly bundle_id: string
  readonly title: string
  readonly description: string | null
  readonly status: TaskStatus
  readonly depends_on_task_ids: readonly string[]
  readonly claimed_by_agent_id: string | null
  readonly claimed_at: string | null
  readonly completed_at: string | null
  readonly blocked_reason: string | null
  /** The graph step id this task corresponds to (e.g. "scope", "implement").
   *  Set by BundleService.attach_graph_artifact when the task is created
   *  from a graph node. Null for tasks created outside the graph flow. */
  readonly graph_node_id: string | null
}

export interface FactRef {
  readonly id: string
  readonly claim: string
  readonly source_url: string | null
  readonly source_title: string | null
  readonly captured_by: string
  readonly confidence: number | null
}

export interface CodeRef {
  readonly repo_url: string
  readonly branch: string
  readonly commit_sha: string
  readonly paths: readonly string[]
}

export interface Event {
  readonly id: string
  readonly recipe_id: string
  readonly bundle_id: string | null
  readonly task_id: string | null
  readonly type: EventType
  readonly actor_id: string
  readonly actor_type: ActorType
  readonly body: string
  readonly payload: EventPayload | null
  readonly sequence: number
  readonly facts: readonly FactRef[]
  readonly code_refs: readonly CodeRef[]
  readonly created_at: string
  readonly expires_at: string | null
}

export interface DigestTaskResult {
  readonly task_id: string
  readonly outcome: string
}

export interface Digest {
  readonly id: string
  readonly recipe_id: string
  readonly bundle_id: string
  readonly summary: string
  readonly task_results: readonly DigestTaskResult[]
  readonly facts: readonly FactRef[]
  readonly code_refs: readonly CodeRef[]
  readonly submitted_by: string
  readonly submitted_at: string
  readonly decision: DigestDecision
  readonly decided_by: string | null
  readonly decided_at: string | null
}

export interface ForkAnchor {
  readonly id: number
  readonly kind: 'anchor'
  readonly payload: {
    readonly name?: string
    readonly phase?: string
    readonly summary?: string
    readonly facts?: readonly FactRef[]
    readonly decisions?: readonly string[]
    readonly code_ref?: CodeRef
    readonly next_steps?: readonly string[]
  }
  readonly meta: Record<string, unknown>
  readonly date: string
}

export interface BundleWithDetails {
  readonly bundle: Bundle
  readonly tasks: readonly Task[]
  readonly events: readonly Event[]
  readonly digest: Digest | null
  readonly fork_anchors?: readonly ForkAnchor[]
}

export interface RecipeSummary {
  readonly recipe: Recipe
  readonly member_count: number
  readonly agent_count: number
  readonly online_agent_count: number
  readonly active_bundle_count: number
  readonly owners: readonly string[]
  readonly active_bundle: Bundle | null
  readonly latest_digest: Digest | null
}

export interface CookbookGroup {
  readonly cookbook: Cookbook
  readonly recipes: readonly RecipeSummary[]
  readonly agents: readonly AgentPresence[]
}

export interface CookbookData {
  readonly cookbooks: readonly CookbookGroup[]
  readonly selected_recipe_id: string | null
}

export interface WorkspaceData {
  readonly recipe: Recipe
  readonly members: readonly RecipeMember[]
  readonly agents: readonly AgentPresence[]
  readonly bundles: readonly Bundle[]
  readonly recent_digests: readonly Digest[]
  readonly selected_bundle_id: string | null
  readonly selected_bundle: BundleWithDetails | null
}

export interface DigestReviewData {
  readonly recipe: Recipe
  readonly selected_bundle: BundleWithDetails
}

export interface HistoryRecord {
  readonly digest: Digest
  readonly bundle: Bundle | null
}

export interface HistoryMetrics {
  readonly approved_count: number
  readonly median_review_minutes: number | null
  readonly most_recent_approval_at: string | null
}

export interface HistoryData {
  readonly recipe: Recipe
  readonly metrics: HistoryMetrics
  readonly records: readonly HistoryRecord[]
}

export interface CookbookDetailData {
  readonly cookbook: Cookbook
  readonly recipes: readonly RecipeSummary[]
  readonly agents: readonly AgentPresence[]
  readonly members: readonly RecipeMember[]
}

export interface CreateRecipeInput {
  readonly name: string
  readonly repo_url: string
  readonly default_branch: string
  readonly created_by: string
  readonly cookbook_id: string
}

export interface CreateBundleInput {
  readonly prompt: string
  readonly requested_by: string
  readonly task_titles: readonly string[]
}

export interface DecisionInput {
  readonly decision: Exclude<DigestDecision, 'pending'>
  readonly decided_by: string
  readonly note?: string
}


