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
      readonly agentName: string
      readonly model?: string
      readonly cwd?: string
      readonly sessionId?: string
      readonly tools?: readonly string[]
      readonly prompt?: string
    }
  | {
      readonly kind: 'agent_reply'
      readonly text: string
      readonly blockIndex: number
      readonly model?: string
      readonly stream?: 'stdout' | 'stderr'
    }
  | {
      readonly kind: 'thinking'
      readonly text: string
    }
  | {
      readonly kind: 'tool_use'
      readonly toolUseId: string
      readonly toolName: string
      readonly input: unknown
    }
  | {
      readonly kind: 'tool_result'
      readonly toolUseId: string
      readonly output: string
      readonly isError: boolean
    }
  | {
      readonly kind: 'session_end'
      readonly success: boolean
      readonly durationMs?: number
      readonly numTurns?: number
      readonly tokens?: TokenUsage
      readonly costUsd?: number
      readonly resultText?: string
      readonly blockedReason?: string
    }

export type AgentStatus = 'online' | 'offline' | 'busy'

export type ActorType = 'human' | 'agent' | 'system' | 'hook'

export type DigestDecision = 'pending' | 'approved' | 'rejected'

export interface Cookbook {
  readonly id: string
  readonly name: string
  readonly ownerId: string
  readonly createdAt: string
}

export interface Recipe {
  readonly id: string
  readonly name: string
  readonly repoUrl: string
  readonly defaultBranch: string
  readonly createdBy: string
  readonly createdAt: string
  readonly cookbookId: string
}

export interface RecipeMember {
  readonly id: string
  readonly recipeId: string
  readonly actorId: string
  readonly actorType: 'human' | 'agent'
  readonly role: Role
  readonly joinedAt: string
}

export interface AgentPresence {
  readonly agentId: string
  readonly cookbookId: string
  readonly displayName: string
  readonly capabilities: readonly string[]
  readonly status: AgentStatus
  readonly lastHeartbeatAt: string
  readonly currentTaskId: string | null
  readonly ownerUsername: string | null
  readonly mintTxHash: string | null
  readonly mintTokenId: number | null
}

export interface Bundle {
  readonly id: string
  readonly recipeId: string
  readonly prompt: string
  readonly status: BundleStatus
  readonly createdBy: string
  readonly createdAt: string
  readonly claimedAt: string | null
  readonly cookedAt: string | null
  readonly digestedAt: string | null
  readonly blockedReason: string | null
  /** Validated pydantic-graph source attached by the planner. Null until
   *  the planner POSTs back to /bundles/{id}/graph. */
  readonly graphCode: string | null
  /** Mermaid flowchart rendered from the validated graph. Null until
   *  the bundle has graph_code attached. */
  readonly graphMermaid: string | null
}

export interface Task {
  readonly id: string
  readonly bundleId: string
  readonly title: string
  readonly description: string | null
  readonly status: TaskStatus
  readonly dependsOnTaskIds: readonly string[]
  readonly claimedByAgentId: string | null
  readonly claimedAt: string | null
  readonly completedAt: string | null
  readonly blockedReason: string | null
  /** The graph step id this task corresponds to (e.g. "scope", "implement").
   *  Set by BundleService.attach_graph_artifact when the task is created
   *  from a graph node. Null for tasks created outside the graph flow. */
  readonly graphNodeId: string | null
}

export interface FactRef {
  readonly id: string
  readonly claim: string
  readonly sourceUrl: string | null
  readonly sourceTitle: string | null
  readonly capturedBy: string
  readonly confidence: number | null
}

export interface CodeRef {
  readonly repoUrl: string
  readonly branch: string
  readonly commitSha: string
  readonly paths: readonly string[]
}

export interface Event {
  readonly id: string
  readonly recipeId: string
  readonly bundleId: string | null
  readonly taskId: string | null
  readonly type: EventType
  readonly actorId: string
  readonly actorType: ActorType
  readonly body: string
  readonly payload: EventPayload | null
  readonly sequence: number
  readonly facts: readonly FactRef[]
  readonly codeRefs: readonly CodeRef[]
  readonly createdAt: string
  readonly expiresAt: string | null
}

export interface DigestTaskResult {
  readonly taskId: string
  readonly outcome: string
}

export interface Digest {
  readonly id: string
  readonly recipeId: string
  readonly bundleId: string
  readonly summary: string
  readonly taskResults: readonly DigestTaskResult[]
  readonly facts: readonly FactRef[]
  readonly codeRefs: readonly CodeRef[]
  readonly submittedBy: string
  readonly submittedAt: string
  readonly decision: DigestDecision
  readonly decidedBy: string | null
  readonly decidedAt: string | null
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
    readonly codeRef?: CodeRef
    readonly nextSteps?: readonly string[]
  }
  readonly meta: Record<string, unknown>
  readonly date: string
}

export interface BundleWithDetails {
  readonly bundle: Bundle
  readonly tasks: readonly Task[]
  readonly events: readonly Event[]
  readonly digest: Digest | null
  readonly forkAnchors?: readonly ForkAnchor[]
}

export interface RecipeSummary {
  readonly recipe: Recipe
  readonly memberCount: number
  readonly agentCount: number
  readonly onlineAgentCount: number
  readonly activeBundleCount: number
  readonly owners: readonly string[]
  readonly activeBundle: Bundle | null
  readonly latestDigest: Digest | null
}

export interface CookbookGroup {
  readonly cookbook: Cookbook
  readonly recipes: readonly RecipeSummary[]
  readonly agents: readonly AgentPresence[]
}

export interface CookbookData {
  readonly cookbooks: readonly CookbookGroup[]
  readonly selectedRecipeId: string | null
}

export interface WorkspaceData {
  readonly recipe: Recipe
  readonly members: readonly RecipeMember[]
  readonly agents: readonly AgentPresence[]
  readonly bundles: readonly Bundle[]
  readonly recentDigests: readonly Digest[]
  readonly selectedBundleId: string | null
  readonly selectedBundle: BundleWithDetails | null
}

export interface DigestReviewData {
  readonly recipe: Recipe
  readonly selectedBundle: BundleWithDetails
}

export interface HistoryRecord {
  readonly digest: Digest
  readonly bundle: Bundle | null
}

export interface HistoryMetrics {
  readonly approvedCount: number
  readonly medianReviewMinutes: number | null
  readonly mostRecentApprovalAt: string | null
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
  readonly repoUrl: string
  readonly defaultBranch: string
  readonly createdBy: string
  readonly cookbookId: string
}

export interface CreateBundleInput {
  readonly prompt: string
  readonly requestedBy: string
  readonly taskTitles: readonly string[]
}

export interface DecisionInput {
  readonly decision: Exclude<DigestDecision, 'pending'>
  readonly decidedBy: string
  readonly note?: string
}


