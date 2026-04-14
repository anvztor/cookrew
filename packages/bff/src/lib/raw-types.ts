/**
 * Raw interfaces representing the snake_case JSON shapes returned by KrewHub API.
 * These are normalized into camelCase domain types by normalizers.ts.
 */
import type { Bundle, Digest, Event, Task } from '@cookrew/shared'

export interface RawCookbook {
  readonly id: string
  readonly name: string
  readonly owner_id: string
  readonly created_at: string
}

export interface RawCookbookDetailResponse {
  readonly cookbook: RawCookbook
  readonly recipes: readonly RawRecipe[]
  readonly agents: readonly RawAgentPresence[]
}

export interface RawCookbooksResponse {
  readonly cookbooks: readonly RawCookbook[]
}

export interface RawRecipe {
  readonly id: string
  readonly name: string
  readonly repo_url: string
  readonly default_branch: string
  readonly created_by: string
  readonly created_at: string
  readonly cookbook_id: string
}

export interface RawRecipeMember {
  readonly id: string
  readonly recipe_id: string
  readonly actor_id: string
  readonly actor_type: 'human' | 'agent'
  readonly role: 'owner' | 'member' | 'agent'
  readonly joined_at: string
}

export interface RawAgentPresence {
  readonly agent_id: string
  readonly cookbook_id: string
  readonly display_name: string
  readonly capabilities: readonly string[]
  readonly status: 'online' | 'offline' | 'busy'
  readonly last_heartbeat_at: string
  readonly current_task_id: string | null
  readonly owner_username: string | null
  readonly mint_tx_hash: string | null
  readonly mint_token_id: number | null
}

export interface RawBundle {
  readonly id: string
  readonly recipe_id: string
  readonly prompt: string
  readonly status: Bundle['status']
  readonly created_by: string
  readonly created_at: string
  readonly claimed_at: string | null
  readonly cooked_at: string | null
  readonly digested_at: string | null
  readonly blocked_reason: string | null
  readonly graph_code?: string | null
  readonly graph_mermaid?: string | null
}

export interface RawTask {
  readonly id: string
  readonly bundle_id: string
  readonly title: string
  readonly description: string | null
  readonly status: Task['status']
  readonly depends_on_task_ids: readonly string[]
  readonly claimed_by_agent_id: string | null
  readonly claimed_at: string | null
  readonly completed_at: string | null
  readonly blocked_reason: string | null
  readonly graph_node_id?: string | null
}

export interface RawFactRef {
  readonly id: string
  readonly claim: string
  readonly source_url: string | null
  readonly source_title: string | null
  readonly captured_by: string
  readonly confidence: number | null
}

export interface RawCodeRef {
  readonly repo_url: string
  readonly branch: string
  readonly commit_sha: string
  readonly paths: readonly string[]
}

export interface RawEvent {
  readonly id: string
  readonly recipe_id: string
  readonly bundle_id: string
  readonly task_id: string | null
  readonly type: Event['type']
  readonly actor_id: string
  readonly actor_type: Event['actorType']
  readonly body: string
  readonly payload: Record<string, unknown> | null
  readonly sequence: number
  readonly facts: readonly RawFactRef[]
  readonly code_refs: readonly RawCodeRef[]
  readonly created_at: string
  readonly expires_at: string | null
}

export interface RawDigestTaskResult {
  readonly task_id: string
  readonly outcome: string
}

export interface RawDigest {
  readonly id: string
  readonly recipe_id: string
  readonly bundle_id: string
  readonly summary: string
  readonly task_results: readonly RawDigestTaskResult[]
  readonly facts: readonly RawFactRef[]
  readonly code_refs: readonly RawCodeRef[]
  readonly submitted_by: string
  readonly submitted_at: string
  readonly decision: Digest['decision']
  readonly decided_by: string | null
  readonly decided_at: string | null
}

export interface RawRecipeDetailResponse {
  readonly recipe: RawRecipe
  readonly members: readonly RawRecipeMember[]
  readonly agents: readonly RawAgentPresence[]
  readonly bundles: readonly RawBundle[]
  readonly digests: readonly RawDigest[]
}

export interface RawBundleDetailResponse {
  readonly bundle: RawBundle
  readonly tasks: readonly RawTask[]
  readonly events: readonly RawEvent[]
}

export interface RawDigestResponse {
  readonly digest: RawDigest
}

export interface RawRecipesResponse {
  readonly recipes: readonly RawRecipe[]
}
