import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { generateTaskSeeds, normalizeTaskSeeds } from '@/lib/task-seeds'
import { publishRecipeStream } from '@/lib/server/stream-hub'
import type {
  AgentPresence,
  Bundle,
  BundleWithDetails,
  Digest,
  Event,
  Recipe,
  RecipeMember,
  Task,
} from '@/types'

interface DemoState {
  recipes: Recipe[]
  members: RecipeMember[]
  agents: AgentPresence[]
  bundles: Bundle[]
  tasks: Task[]
  events: Event[]
  digests: Digest[]
}

const STORE_PATH = join(process.cwd(), '.next', 'demo-store.json')

function clone<T>(value: T): T {
  return structuredClone(value)
}

function readState(): DemoState {
  if (!existsSync(STORE_PATH)) {
    const initialState = createInitialState()
    writeState(initialState)
    return initialState
  }

  return JSON.parse(readFileSync(STORE_PATH, 'utf8')) as DemoState
}

function writeState(state: DemoState): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true })
  writeFileSync(STORE_PATH, JSON.stringify(state, null, 2))
}

function isoMinutesAgo(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

function createInitialState(): DemoState {
  const recipes: Recipe[] = []
  const members: RecipeMember[] = []
  const agents: AgentPresence[] = []
  const bundles: Bundle[] = []
  const tasks: Task[] = []
  const events: Event[] = []
  const digests: Digest[] = []

  return {
    recipes,
    members,
    agents,
    bundles,
    tasks,
    events,
    digests,
  }
}

function member(
  id: string,
  recipeId: string,
  actorId: string,
  actorType: 'human' | 'agent',
  role: 'owner' | 'member' | 'agent',
  joinedMinutesAgo: number
): RecipeMember {
  return {
    id,
    recipeId,
    actorId,
    actorType,
    role,
    joinedAt: isoMinutesAgo(joinedMinutesAgo),
  }
}

function agent(
  agentId: string,
  cookbookId: string,
  displayName: string,
  capabilities: string[],
  status: AgentPresence['status'],
  heartbeatMinutesAgo: number,
  currentTaskId: string | null
): AgentPresence {
  return {
    agentId,
    cookbookId,
    displayName,
    capabilities,
    status,
    lastHeartbeatAt: isoMinutesAgo(heartbeatMinutesAgo),
    currentTaskId,
    ownerUsername: null,
    mintTxHash: null,
    mintTokenId: null,
  }
}

function bundle(
  id: string,
  recipeId: string,
  prompt: string,
  status: Bundle['status'],
  createdBy: string,
  createdMinutesAgo: number,
  claimedMinutesAgo: number | null,
  cookedMinutesAgo: number | null,
  digestedMinutesAgo: number | null,
  blockedReason: string | null
): Bundle {
  return {
    id,
    recipeId,
    prompt,
    status,
    createdBy,
    createdAt: isoMinutesAgo(createdMinutesAgo),
    claimedAt: claimedMinutesAgo === null ? null : isoMinutesAgo(claimedMinutesAgo),
    cookedAt: cookedMinutesAgo === null ? null : isoMinutesAgo(cookedMinutesAgo),
    digestedAt: digestedMinutesAgo === null ? null : isoMinutesAgo(digestedMinutesAgo),
    blockedReason,
    graphCode: null,
    graphMermaid: null,
  }
}

function task(
  id: string,
  bundleId: string,
  title: string,
  status: Task['status'],
  dependsOnTaskIds: string[],
  claimedByAgentId: string | null,
  claimedMinutesAgo: number | null,
  completedMinutesAgo: number | null,
  blockedReason: string | null
): Task {
  return {
    id,
    bundleId,
    title,
    description: null,
    status,
    dependsOnTaskIds,
    claimedByAgentId,
    claimedAt: claimedMinutesAgo === null ? null : isoMinutesAgo(claimedMinutesAgo),
    completedAt: completedMinutesAgo === null ? null : isoMinutesAgo(completedMinutesAgo),
    blockedReason,
    graphNodeId: null,
  }
}

function fact(
  id: string,
  claim: string,
  capturedBy: string,
  sourceUrl: string | null,
  sourceTitle: string | null,
  confidence: number | null
) {
  return {
    id,
    claim,
    sourceUrl,
    sourceTitle,
    capturedBy,
    confidence,
  }
}

function codeRef(
  repoUrl: string,
  branch: string,
  commitSha: string,
  paths: string[]
) {
  return {
    repoUrl,
    branch,
    commitSha,
    paths,
  }
}

function digest(
  id: string,
  recipeId: string,
  bundleId: string,
  summary: string,
  taskResults: Digest['taskResults'],
  facts: Digest['facts'],
  codeRefs: Digest['codeRefs'],
  submittedBy: string,
  submittedMinutesAgo: number,
  decision: Digest['decision'],
  decidedBy: string | null,
  decidedMinutesAgo: number | null
): Digest {
  return {
    id,
    recipeId,
    bundleId,
    summary,
    taskResults,
    facts,
    codeRefs,
    submittedBy,
    submittedAt: isoMinutesAgo(submittedMinutesAgo),
    decision,
    decidedBy,
    decidedAt: decidedMinutesAgo === null ? null : isoMinutesAgo(decidedMinutesAgo),
  }
}

function event(
  id: string,
  recipeId: string,
  bundleId: string,
  taskId: string | null,
  type: Event['type'],
  actorId: string,
  actorType: Event['actorType'],
  body: string,
  createdMinutesAgo: number,
  facts: Event['facts'] = [],
  codeRefs: Event['codeRefs'] = []
): Event {
  return {
    id,
    recipeId,
    bundleId,
    taskId,
    type,
    actorId,
    actorType,
    body,
    payload: null,
    sequence: 0,
    facts,
    codeRefs,
    createdAt: isoMinutesAgo(createdMinutesAgo),
    expiresAt: null,
  }
}

function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function resetDemoState(): void {
  writeState(createInitialState())
}

export function listRecipes(): Recipe[] {
  return clone(readState().recipes)
}

export function getRecipe(recipeId: string): Recipe | null {
  const recipe = readState().recipes.find((entry) => entry.id === recipeId)
  return recipe ? clone(recipe) : null
}

export function listMembers(recipeId: string): RecipeMember[] {
  return clone(readState().members.filter((entry) => entry.recipeId === recipeId))
}

export function listAgents(cookbookId: string): AgentPresence[] {
  return clone(readState().agents.filter((entry) => entry.cookbookId === cookbookId))
}

export function listBundles(recipeId: string): Bundle[] {
  const state = readState()
  return clone(
    state.bundles
      .filter((entry) => entry.recipeId === recipeId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  )
}

function getBundle(bundleId: string): Bundle | null {
  const bundle = readState().bundles.find((entry) => entry.id === bundleId)
  return bundle ? clone(bundle) : null
}

function listTasks(bundleId: string): Task[] {
  return clone(readState().tasks.filter((entry) => entry.bundleId === bundleId))
}

function listEvents(bundleId: string): Event[] {
  const state = readState()
  return clone(
    state.events
      .filter((entry) => entry.bundleId === bundleId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  )
}

function getDigestByBundle(bundleId: string): Digest | null {
  const digest = readState().digests.find((entry) => entry.bundleId === bundleId)
  return digest ? clone(digest) : null
}

export function listApprovedDigests(recipeId: string): Digest[] {
  const state = readState()
  return clone(
    state.digests
      .filter((entry) => entry.recipeId === recipeId && entry.decision === 'approved')
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
  )
}

export function getBundleWithDetails(bundleId: string): BundleWithDetails | null {
  const bundle = getBundle(bundleId)
  if (!bundle) {
    return null
  }

  return {
    bundle,
    tasks: listTasks(bundleId),
    events: listEvents(bundleId),
    digest: getDigestByBundle(bundleId),
  }
}

export function createRecipeInDemo(input: {
  name: string
  repoUrl: string
  defaultBranch: string
  createdBy: string
}): Recipe {
  const state = readState()
  const recipe: Recipe = {
    id: nextId('rec'),
    name: input.name,
    repoUrl: input.repoUrl,
    defaultBranch: input.defaultBranch,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    cookbookId: 'cb_demo',
  }

  const owner: RecipeMember = {
    id: nextId('mem'),
    recipeId: recipe.id,
    actorId: input.createdBy,
    actorType: 'human',
    role: 'owner',
    joinedAt: recipe.createdAt,
  }

  state.recipes.unshift(recipe)
  state.members.unshift(owner)
  writeState(state)

  return clone(recipe)
}

export function createBundleInDemo(input: {
  recipeId: string
  prompt: string
  requestedBy: string
  taskTitles: readonly string[]
}): BundleWithDetails {
  const state = readState()
  const taskTitles = normalizeTaskSeeds(input.taskTitles)
  const effectiveTaskTitles =
    taskTitles.length > 0 ? taskTitles : generateTaskSeeds(input.prompt)
  const now = new Date().toISOString()

  const createdBundle: Bundle = {
    id: nextId('bun'),
    recipeId: input.recipeId,
    prompt: input.prompt,
    status: 'open',
    createdBy: input.requestedBy,
    createdAt: now,
    claimedAt: null,
    cookedAt: null,
    digestedAt: null,
    blockedReason: null,
    graphCode: null,
    graphMermaid: null,
  }

  const createdTasks = effectiveTaskTitles.map((title, index) => ({
    id: nextId('task'),
    bundleId: createdBundle.id,
    title,
    description: null,
    status: index === 0 ? 'claimed' : 'open',
    dependsOnTaskIds: index === 0 ? [] : [],
    claimedByAgentId: index === 0 ? 'ag_codex' : null,
    claimedAt: index === 0 ? now : null,
    completedAt: null,
    blockedReason: null,
    graphNodeId: null,
  } satisfies Task))

  const promptEvent: Event = {
    id: nextId('evt'),
    recipeId: input.recipeId,
    bundleId: createdBundle.id,
    taskId: null,
    type: 'prompt',
    actorId: input.requestedBy,
    actorType: 'human',
    body: input.prompt,
    facts: [],
    codeRefs: [],
    payload: null,
    sequence: 0,
    createdAt: now,
    expiresAt: null,
  }

  const planEvent: Event = {
    id: nextId('evt'),
    recipeId: input.recipeId,
    bundleId: createdBundle.id,
    taskId: null,
    type: 'plan',
    actorId: 'system',
    actorType: 'system',
    body: `Created bundle with ${createdTasks.length} starter tasks.`,
    facts: [],
    codeRefs: [],
    payload: null,
    sequence: 0,
    createdAt: now,
    expiresAt: null,
  }

  state.bundles.unshift(createdBundle)
  state.tasks.unshift(...createdTasks)
  state.events.unshift(planEvent, promptEvent)
  writeState(state)

  publishRecipeStream(input.recipeId, 'bundle.created', {
    bundleId: createdBundle.id,
    status: createdBundle.status,
    taskCount: createdTasks.length,
  })

  return {
    bundle: clone(createdBundle),
    tasks: clone(createdTasks),
    events: clone([planEvent, promptEvent]),
    digest: null,
  }
}

export function decideDigestInDemo(input: {
  bundleId: string
  decision: 'approved' | 'rejected'
  decidedBy: string
  note?: string
}): Digest | null {
  const state = readState()
  const digestIndex = state.digests.findIndex((entry) => entry.bundleId === input.bundleId)
  const bundleIndex = state.bundles.findIndex((entry) => entry.id === input.bundleId)

  if (digestIndex < 0 || bundleIndex < 0) {
    return null
  }

  const decidedAt = new Date().toISOString()
  const currentDigest = state.digests[digestIndex]
  const updatedDigest: Digest = {
    ...currentDigest,
    decision: input.decision,
    decidedBy: input.decidedBy,
    decidedAt,
  }

  const currentBundle = state.bundles[bundleIndex]
  const updatedBundle: Bundle = {
    ...currentBundle,
    status: input.decision === 'approved' ? 'digested' : 'rejected',
    digestedAt: input.decision === 'approved' ? decidedAt : currentBundle.digestedAt,
  }

  const decisionEvent: Event = {
    id: nextId('evt'),
    recipeId: currentDigest.recipeId,
    bundleId: currentDigest.bundleId,
    taskId: null,
    type: input.decision === 'approved' ? 'digest_approved' : 'digest_rejected',
    actorId: input.decidedBy,
    actorType: 'human',
    body: input.note?.trim()
      ? `Digest ${input.decision}. ${input.note.trim()}`
      : `Digest ${input.decision}.`,
    facts: [],
    codeRefs: [],
    payload: null,
    sequence: 0,
    createdAt: decidedAt,
    expiresAt: null,
  }

  state.digests[digestIndex] = updatedDigest
  state.bundles[bundleIndex] = updatedBundle
  state.events.unshift(decisionEvent)
  writeState(state)

  publishRecipeStream(currentDigest.recipeId, 'bundle.decision', {
    bundleId: currentDigest.bundleId,
    decision: input.decision,
  })

  return clone(updatedDigest)
}

export function rerunBundleInDemo(input: {
  bundleId: string
}): BundleWithDetails | null {
  const state = readState()
  const bundleIndex = state.bundles.findIndex((entry) => entry.id === input.bundleId)
  if (bundleIndex < 0) {
    return null
  }

  const blockedTasks = state.tasks.filter(
    (entry) => entry.bundleId === input.bundleId && entry.status === 'blocked'
  )
  if (blockedTasks.length === 0) {
    return null
  }

  const now = new Date().toISOString()
  state.bundles[bundleIndex] = {
    ...state.bundles[bundleIndex],
    status: 'open',
    blockedReason: null,
  }

  state.tasks = state.tasks.map((task) =>
    task.bundleId === input.bundleId && task.status === 'blocked'
      ? {
          ...task,
          status: 'open',
          claimedByAgentId: null,
          claimedAt: null,
          completedAt: null,
          blockedReason: null,
        }
      : task
  )

  const rerunEvent: Event = {
    id: nextId('evt'),
    recipeId: state.bundles[bundleIndex].recipeId,
    bundleId: input.bundleId,
    taskId: null,
    type: 'plan',
    actorId: 'system',
    actorType: 'system',
    body: `Re-run requested for ${blockedTasks.length} blocked task${
      blockedTasks.length === 1 ? '' : 's'
    }. Tasks reopened for reassignment.`,
    facts: [],
    codeRefs: [],
    payload: null,
    sequence: 0,
    createdAt: now,
    expiresAt: null,
  }

  state.events.unshift(rerunEvent)
  writeState(state)

  publishRecipeStream(state.bundles[bundleIndex].recipeId, 'task.updated', {
    bundleId: input.bundleId,
    taskId: blockedTasks[0].id,
    status: 'open',
  })

  return getBundleWithDetails(input.bundleId)
}

export function submitDigestInDemo(input: {
  bundleId: string
  submittedBy: string
  summary: string
  taskResults: Digest['taskResults']
  facts: Digest['facts']
  codeRefs: Digest['codeRefs']
}): Digest | null {
  const state = readState()
  const bundleIndex = state.bundles.findIndex((entry) => entry.id === input.bundleId)

  if (bundleIndex < 0 || state.digests.some((entry) => entry.bundleId === input.bundleId)) {
    return null
  }

  const bundle = state.bundles[bundleIndex]
  const tasks = state.tasks.filter((entry) => entry.bundleId === input.bundleId)
  const allTerminal = tasks.every((task) =>
    ['done', 'blocked', 'cancelled'].includes(task.status)
  )

  if (!['cooked', 'blocked'].includes(bundle.status) || !allTerminal) {
    return null
  }

  const submittedAt = new Date().toISOString()
  const digest: Digest = {
    id: nextId('dig'),
    recipeId: bundle.recipeId,
    bundleId: bundle.id,
    summary: input.summary,
    taskResults: clone(input.taskResults),
    facts: clone(input.facts),
    codeRefs: clone(input.codeRefs),
    submittedBy: input.submittedBy,
    submittedAt,
    decision: 'pending',
    decidedBy: null,
    decidedAt: null,
  }

  const digestEvent: Event = {
    id: nextId('evt'),
    recipeId: bundle.recipeId,
    bundleId: bundle.id,
    taskId: null,
    type: 'digest_submitted',
    actorId: input.submittedBy,
    actorType: 'agent',
    body: `Digest submitted: ${input.summary.slice(0, 100)}`,
    facts: [],
    codeRefs: [],
    payload: null,
    sequence: 0,
    createdAt: submittedAt,
    expiresAt: null,
  }

  state.digests.unshift(digest)
  state.events.unshift(digestEvent)
  writeState(state)

  publishRecipeStream(bundle.recipeId, 'bundle.digest_submitted', {
    bundleId: bundle.id,
    digestId: digest.id,
  })

  return clone(digest)
}
