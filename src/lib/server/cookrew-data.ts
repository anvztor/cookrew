import {
  createBundleInDemo,
  createRecipeInDemo,
  decideDigestInDemo,
  getBundleWithDetails,
  getRecipe,
  listAgents,
  listApprovedDigests,
  listBundles,
  listMembers,
  listRecipes,
} from '@/lib/server/demo-store'
import { calculateMedian } from '@/lib/format'
import { generateTaskSeeds, normalizeTaskSeeds } from '@/lib/task-seeds'
import type {
  AgentPresence,
  Bundle,
  BundleWithDetails,
  CookbookData,
  CreateBundleInput,
  CreateRecipeInput,
  DecisionInput,
  Digest,
  DigestReviewData,
  HistoryData,
  HistoryRecord,
  Recipe,
  RecipeMember,
  RecipeSummary,
  WorkspaceData,
} from '@/types'

interface RawRecipe {
  id: string
  name: string
  repo_url: string
  default_branch: string
  created_by: string
  created_at: string
}

interface RawRecipeMember {
  id: string
  recipe_id: string
  actor_id: string
  actor_type: 'human' | 'agent'
  role: 'owner' | 'member' | 'agent'
  joined_at: string
}

interface RawAgentPresence {
  agent_id: string
  recipe_id: string
  display_name: string
  capabilities: string[]
  status: 'online' | 'offline' | 'busy'
  last_heartbeat_at: string
  current_task_id: string | null
}

interface RawBundle {
  id: string
  recipe_id: string
  prompt: string
  status: Bundle['status']
  created_by: string
  created_at: string
  claimed_at: string | null
  cooked_at: string | null
  digested_at: string | null
  blocked_reason: string | null
}

interface RawTask {
  id: string
  bundle_id: string
  title: string
  description: string | null
  status: BundleWithDetails['tasks'][number]['status']
  depends_on_task_ids: string[]
  claimed_by_agent_id: string | null
  claimed_at: string | null
  completed_at: string | null
  blocked_reason: string | null
}

interface RawFactRef {
  id: string
  claim: string
  source_url: string | null
  source_title: string | null
  captured_by: string
  confidence: number | null
}

interface RawCodeRef {
  repo_url: string
  branch: string
  commit_sha: string
  paths: string[]
}

interface RawEvent {
  id: string
  recipe_id: string
  bundle_id: string
  task_id: string | null
  type: BundleWithDetails['events'][number]['type']
  actor_id: string
  actor_type: BundleWithDetails['events'][number]['actorType']
  body: string
  facts: RawFactRef[]
  code_refs: RawCodeRef[]
  created_at: string
  expires_at: string | null
}

interface RawDigestTaskResult {
  task_id: string
  outcome: string
}

interface RawDigest {
  id: string
  recipe_id: string
  bundle_id: string
  summary: string
  task_results: RawDigestTaskResult[]
  facts: RawFactRef[]
  code_refs: RawCodeRef[]
  submitted_by: string
  submitted_at: string
  decision: Digest['decision']
  decided_by: string | null
  decided_at: string | null
}

interface RawRecipeDetailResponse {
  recipe: RawRecipe
  members: RawRecipeMember[]
  agents: RawAgentPresence[]
  bundles: RawBundle[]
  digests: RawDigest[]
}

interface RawBundleDetailResponse {
  bundle: RawBundle
  tasks: RawTask[]
  events: RawEvent[]
}

interface RawDigestResponse {
  digest: RawDigest
}

interface RawRecipesResponse {
  recipes: RawRecipe[]
}

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
}

export function hasKrewHubProxy(): boolean {
  return Boolean(process.env.KREWHUB_BASE_URL)
}

function normalizeRecipe(recipe: RawRecipe): Recipe {
  return {
    id: recipe.id,
    name: recipe.name,
    repoUrl: recipe.repo_url,
    defaultBranch: recipe.default_branch,
    createdBy: recipe.created_by,
    createdAt: recipe.created_at,
  }
}

function normalizeMember(member: RawRecipeMember) {
  return {
    id: member.id,
    recipeId: member.recipe_id,
    actorId: member.actor_id,
    actorType: member.actor_type,
    role: member.role,
    joinedAt: member.joined_at,
  } as const
}

function normalizeAgent(agent: RawAgentPresence) {
  return {
    agentId: agent.agent_id,
    recipeId: agent.recipe_id,
    displayName: agent.display_name,
    capabilities: agent.capabilities,
    status: agent.status,
    lastHeartbeatAt: agent.last_heartbeat_at,
    currentTaskId: agent.current_task_id,
  } as const
}

function normalizeBundle(bundle: RawBundle): Bundle {
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
  }
}

function normalizeFact(fact: RawFactRef) {
  return {
    id: fact.id,
    claim: fact.claim,
    sourceUrl: fact.source_url,
    sourceTitle: fact.source_title,
    capturedBy: fact.captured_by,
    confidence: fact.confidence,
  } as const
}

function normalizeCodeRef(codeRef: RawCodeRef) {
  return {
    repoUrl: codeRef.repo_url,
    branch: codeRef.branch,
    commitSha: codeRef.commit_sha,
    paths: codeRef.paths,
  } as const
}

function normalizeTask(task: RawTask) {
  return {
    id: task.id,
    bundleId: task.bundle_id,
    title: task.title,
    description: task.description,
    status: task.status,
    dependsOnTaskIds: task.depends_on_task_ids,
    claimedByAgentId: task.claimed_by_agent_id,
    claimedAt: task.claimed_at,
    completedAt: task.completed_at,
    blockedReason: task.blocked_reason,
  } as const
}

function normalizeEvent(event: RawEvent) {
  return {
    id: event.id,
    recipeId: event.recipe_id,
    bundleId: event.bundle_id,
    taskId: event.task_id,
    type: event.type,
    actorId: event.actor_id,
    actorType: event.actor_type,
    body: event.body,
    facts: event.facts.map(normalizeFact),
    codeRefs: event.code_refs.map(normalizeCodeRef),
    createdAt: event.created_at,
    expiresAt: event.expires_at,
  } as const
}

function normalizeDigest(digest: RawDigest): Digest {
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

async function requestKrewHub<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const baseUrl = process.env.KREWHUB_BASE_URL
  if (!baseUrl) {
    throw new Error('KREWHUB_BASE_URL is not configured')
  }

  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...(process.env.KREWHUB_API_KEY
        ? { 'X-API-Key': process.env.KREWHUB_API_KEY }
        : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `KrewHub request failed with ${response.status}`)
  }

  return (await response.json()) as T
}

function selectBundleId(bundles: readonly Bundle[], requestedBundleId?: string | null): string | null {
  if (requestedBundleId && bundles.some((bundle) => bundle.id === requestedBundleId)) {
    return requestedBundleId
  }

  return (
    bundles.find((bundle) => ['claimed', 'open', 'cooked', 'blocked'].includes(bundle.status))?.id ??
    bundles[0]?.id ??
    null
  )
}

function buildSummary(input: {
  recipe: Recipe
  members: readonly RecipeMember[]
  agents: readonly AgentPresence[]
  bundles: readonly Bundle[]
  digests: readonly Digest[]
}): RecipeSummary {
  const owners = input.members
    .filter((member) => member.role === 'owner')
    .map((member) => member.actorId)

  const activeBundle =
    input.bundles.find((bundle) => ['open', 'claimed', 'cooked', 'blocked'].includes(bundle.status)) ??
    null

  return {
    recipe: input.recipe,
    memberCount: input.members.length,
    agentCount: input.agents.length,
    onlineAgentCount: input.agents.filter((agent) => agent.status !== 'offline').length,
    activeBundleCount: input.bundles.filter((bundle) =>
      ['open', 'claimed', 'cooked', 'blocked'].includes(bundle.status)
    ).length,
    owners,
    activeBundle,
    latestDigest: input.digests[0] ?? null,
  }
}

export async function listCookbookData(): Promise<CookbookData> {
  if (!hasKrewHubProxy()) {
    const recipes = listRecipes()
    const summaries = recipes.map((recipe) =>
      buildSummary({
        recipe,
        members: listMembers(recipe.id),
        agents: listAgents(recipe.id),
        bundles: listBundles(recipe.id),
        digests: listApprovedDigests(recipe.id),
      })
    )

    return {
      recipes: summaries,
      selectedRecipeId: summaries[0]?.recipe.id ?? null,
    }
  }

  const rawRecipes = await requestKrewHub<RawRecipesResponse>('/recipes')
  const summaries = await Promise.all(
    rawRecipes.recipes.map(async (recipe) => {
      const detail = await requestKrewHub<RawRecipeDetailResponse>(`/recipes/${recipe.id}`)
      return buildSummary({
        recipe: normalizeRecipe(detail.recipe),
        members: detail.members.map(normalizeMember),
        agents: detail.agents.map(normalizeAgent),
        bundles: detail.bundles.map(normalizeBundle),
        digests: detail.digests.map(normalizeDigest),
      })
    })
  )

  return {
    recipes: summaries,
    selectedRecipeId: summaries[0]?.recipe.id ?? null,
  }
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  if (!hasKrewHubProxy()) {
    return createRecipeInDemo(input)
  }

  const response = await requestKrewHub<{ recipe: RawRecipe }>('/recipes', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      repo_url: input.repoUrl,
      default_branch: input.defaultBranch,
      created_by: input.createdBy,
    }),
  })

  return normalizeRecipe(response.recipe)
}

async function loadBundleDetailsFromKrewHub(bundleId: string): Promise<BundleWithDetails | null> {
  const [bundleResponse, digestResponse] = await Promise.all([
    requestKrewHub<RawBundleDetailResponse>(`/bundles/${bundleId}`),
    requestKrewHub<RawDigestResponse>(`/bundles/${bundleId}/digest`).catch(() => null),
  ])

  return {
    bundle: normalizeBundle(bundleResponse.bundle),
    tasks: bundleResponse.tasks.map(normalizeTask),
    events: bundleResponse.events.map(normalizeEvent),
    digest: digestResponse ? normalizeDigest(digestResponse.digest) : null,
  }
}

export async function getWorkspaceData(
  recipeId: string,
  requestedBundleId?: string | null
): Promise<WorkspaceData | null> {
  if (!hasKrewHubProxy()) {
    const recipe = getRecipe(recipeId)
    if (!recipe) {
      return null
    }

    const bundles = listBundles(recipeId)
    const selectedBundleId = selectBundleId(bundles, requestedBundleId)

    return {
      recipe,
      members: listMembers(recipeId),
      agents: listAgents(recipeId),
      bundles,
      recentDigests: listApprovedDigests(recipeId).slice(0, 4),
      selectedBundleId,
      selectedBundle: selectedBundleId ? getBundleWithDetails(selectedBundleId) : null,
    }
  }

  const detail = await requestKrewHub<RawRecipeDetailResponse>(`/recipes/${recipeId}`).catch(() => null)
  if (!detail) {
    return null
  }

  const bundles = detail.bundles.map(normalizeBundle)
  const selectedBundleId = selectBundleId(bundles, requestedBundleId)

  return {
    recipe: normalizeRecipe(detail.recipe),
    members: detail.members.map(normalizeMember),
    agents: detail.agents.map(normalizeAgent),
    bundles,
    recentDigests: detail.digests.map(normalizeDigest).slice(0, 4),
    selectedBundleId,
    selectedBundle: selectedBundleId
      ? await loadBundleDetailsFromKrewHub(selectedBundleId)
      : null,
  }
}

export async function createBundle(
  recipeId: string,
  input: CreateBundleInput
): Promise<{ bundleId: string }> {
  const taskTitles = normalizeTaskSeeds(input.taskTitles)
  const effectiveTaskTitles =
    taskTitles.length > 0 ? taskTitles : generateTaskSeeds(input.prompt)

  if (!hasKrewHubProxy()) {
    const result = createBundleInDemo({
      recipeId,
      prompt: input.prompt,
      requestedBy: input.requestedBy,
      taskTitles: effectiveTaskTitles,
    })

    return { bundleId: result.bundle.id }
  }

  const response = await requestKrewHub<{ bundle: RawBundle }>(`/recipes/${recipeId}/bundles`, {
    method: 'POST',
    body: JSON.stringify({
      prompt: input.prompt,
      requested_by: input.requestedBy,
      tasks: effectiveTaskTitles.map((title) => ({ title })),
    }),
  })

  return { bundleId: response.bundle.id }
}

export async function getDigestReviewData(
  recipeId: string,
  bundleId: string
): Promise<DigestReviewData | null> {
  if (!hasKrewHubProxy()) {
    const recipe = getRecipe(recipeId)
    const selectedBundle = getBundleWithDetails(bundleId)
    if (!recipe || !selectedBundle || !selectedBundle.digest) {
      return null
    }

    return { recipe, selectedBundle }
  }

  const [recipeDetail, bundleDetail] = await Promise.all([
    requestKrewHub<RawRecipeDetailResponse>(`/recipes/${recipeId}`).catch(() => null),
    loadBundleDetailsFromKrewHub(bundleId).catch(() => null),
  ])

  if (!recipeDetail || !bundleDetail || !bundleDetail.digest) {
    return null
  }

  return {
    recipe: normalizeRecipe(recipeDetail.recipe),
    selectedBundle: bundleDetail,
  }
}

export async function decideDigest(
  bundleId: string,
  input: DecisionInput
): Promise<Digest | null> {
  if (!hasKrewHubProxy()) {
    return decideDigestInDemo({
      bundleId,
      decision: input.decision,
      decidedBy: input.decidedBy,
      note: input.note,
    })
  }

  const response = await requestKrewHub<RawDigestResponse>(`/bundles/${bundleId}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      decision: input.decision,
      decided_by: input.decidedBy,
      note: input.note,
    }),
  }).catch(() => null)

  return response ? normalizeDigest(response.digest) : null
}

export async function getHistoryData(recipeId: string): Promise<HistoryData | null> {
  if (!hasKrewHubProxy()) {
    const recipe = getRecipe(recipeId)
    if (!recipe) {
      return null
    }

    const digests = listApprovedDigests(recipeId)
    const bundles = listBundles(recipeId)
    const records = digests.map((digest) => ({
      digest,
      bundle: bundles.find((bundle) => bundle.id === digest.bundleId) ?? null,
    }))

    return {
      recipe,
      metrics: buildHistoryMetrics(digests),
      records,
    }
  }

  const detail = await requestKrewHub<RawRecipeDetailResponse>(`/recipes/${recipeId}`).catch(() => null)
  if (!detail) {
    return null
  }

  const bundles = detail.bundles.map(normalizeBundle)
  const digests = detail.digests.map(normalizeDigest)
  const records: HistoryRecord[] = digests.map((digest) => ({
    digest,
    bundle: bundles.find((bundle) => bundle.id === digest.bundleId) ?? null,
  }))

  return {
    recipe: normalizeRecipe(detail.recipe),
    metrics: buildHistoryMetrics(digests),
    records,
  }
}

function buildHistoryMetrics(digests: readonly Digest[]) {
  const reviewDurations = digests
    .filter((digest) => Boolean(digest.decidedAt))
    .map((digest) => {
      const submittedAt = new Date(digest.submittedAt).getTime()
      const decidedAt = new Date(digest.decidedAt ?? digest.submittedAt).getTime()
      return Math.max(1, Math.round((decidedAt - submittedAt) / 60000))
    })

  return {
    approvedCount: digests.length,
    medianReviewMinutes: calculateMedian(reviewDurations),
    mostRecentApprovalAt: digests[0]?.decidedAt ?? null,
  }
}
