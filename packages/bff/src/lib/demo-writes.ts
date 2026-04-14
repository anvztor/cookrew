import { generateTaskSeeds, normalizeTaskSeeds } from '@cookrew/shared'
import { publishRecipeStream } from './stream-hub'
import {
  clone,
  nextId,
  readState,
  writeState,
  type DemoState,
} from './demo-state'
import { getBundleWithDetails } from './demo-store'
import type {
  Bundle,
  BundleWithDetails,
  Digest,
  Event,
  Recipe,
  RecipeMember,
  Task,
} from '@cookrew/shared'

export function createRecipeInDemo(input: {
  readonly name: string
  readonly repoUrl: string
  readonly defaultBranch: string
  readonly createdBy: string
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

  const updated: DemoState = {
    ...state,
    recipes: [recipe, ...state.recipes],
    members: [owner, ...state.members],
  }
  writeState(updated)

  return clone(recipe)
}

export function createBundleInDemo(input: {
  readonly recipeId: string
  readonly prompt: string
  readonly requestedBy: string
  readonly taskTitles: readonly string[]
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

  const createdTasks: Task[] = effectiveTaskTitles.map((title, index) => ({
    id: nextId('task'),
    bundleId: createdBundle.id,
    title,
    description: null,
    status: index === 0 ? 'claimed' : 'open',
    dependsOnTaskIds: [],
    claimedByAgentId: index === 0 ? 'ag_codex' : null,
    claimedAt: index === 0 ? now : null,
    completedAt: null,
    blockedReason: null,
    graphNodeId: null,
  }))

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

  const updated: DemoState = {
    ...state,
    bundles: [createdBundle, ...state.bundles],
    tasks: [...createdTasks, ...state.tasks],
    events: [planEvent, promptEvent, ...state.events],
  }
  writeState(updated)

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
  readonly bundleId: string
  readonly decision: 'approved' | 'rejected'
  readonly decidedBy: string
  readonly note?: string
}): Digest | null {
  const state = readState()
  const digestIndex = state.digests.findIndex(
    (entry) => entry.bundleId === input.bundleId
  )
  const bundleIndex = state.bundles.findIndex(
    (entry) => entry.id === input.bundleId
  )

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
    digestedAt:
      input.decision === 'approved' ? decidedAt : currentBundle.digestedAt,
  }

  const decisionEvent: Event = {
    id: nextId('evt'),
    recipeId: currentDigest.recipeId,
    bundleId: currentDigest.bundleId,
    taskId: null,
    type:
      input.decision === 'approved' ? 'digest_approved' : 'digest_rejected',
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

  const updated: DemoState = {
    ...state,
    digests: state.digests.map((d, i) =>
      i === digestIndex ? updatedDigest : d
    ),
    bundles: state.bundles.map((b, i) =>
      i === bundleIndex ? updatedBundle : b
    ),
    events: [decisionEvent, ...state.events],
  }
  writeState(updated)

  publishRecipeStream(currentDigest.recipeId, 'bundle.decision', {
    bundleId: currentDigest.bundleId,
    decision: input.decision,
  })

  return clone(updatedDigest)
}

export function rerunBundleInDemo(input: {
  readonly bundleId: string
}): BundleWithDetails | null {
  const state = readState()
  const bundleIndex = state.bundles.findIndex(
    (entry) => entry.id === input.bundleId
  )
  if (bundleIndex < 0) {
    return null
  }

  const blockedTasks = state.tasks.filter(
    (entry) =>
      entry.bundleId === input.bundleId && entry.status === 'blocked'
  )
  if (blockedTasks.length === 0) {
    return null
  }

  const now = new Date().toISOString()
  const updatedBundle: Bundle = {
    ...state.bundles[bundleIndex],
    status: 'open',
    blockedReason: null,
  }

  const rerunEvent: Event = {
    id: nextId('evt'),
    recipeId: updatedBundle.recipeId,
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

  const updated: DemoState = {
    ...state,
    bundles: state.bundles.map((b, i) =>
      i === bundleIndex ? updatedBundle : b
    ),
    tasks: state.tasks.map((task) =>
      task.bundleId === input.bundleId && task.status === 'blocked'
        ? {
            ...task,
            status: 'open' as const,
            claimedByAgentId: null,
            claimedAt: null,
            completedAt: null,
            blockedReason: null,
          }
        : task
    ),
    events: [rerunEvent, ...state.events],
  }
  writeState(updated)

  publishRecipeStream(updatedBundle.recipeId, 'task.updated', {
    bundleId: input.bundleId,
    taskId: blockedTasks[0].id,
    status: 'open',
  })

  return getBundleWithDetails(input.bundleId)
}

export function submitDigestInDemo(input: {
  readonly bundleId: string
  readonly submittedBy: string
  readonly summary: string
  readonly taskResults: Digest['taskResults']
  readonly facts: Digest['facts']
  readonly codeRefs: Digest['codeRefs']
}): Digest | null {
  const state = readState()
  const bundleIndex = state.bundles.findIndex(
    (entry) => entry.id === input.bundleId
  )

  if (
    bundleIndex < 0 ||
    state.digests.some((entry) => entry.bundleId === input.bundleId)
  ) {
    return null
  }

  const b = state.bundles[bundleIndex]
  const tasks = state.tasks.filter(
    (entry) => entry.bundleId === input.bundleId
  )
  const allTerminal = tasks.every((task) =>
    ['done', 'blocked', 'cancelled'].includes(task.status)
  )

  if (!['cooked', 'blocked'].includes(b.status) || !allTerminal) {
    return null
  }

  const submittedAt = new Date().toISOString()
  const newDigest: Digest = {
    id: nextId('dig'),
    recipeId: b.recipeId,
    bundleId: b.id,
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
    recipeId: b.recipeId,
    bundleId: b.id,
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

  const updated: DemoState = {
    ...state,
    digests: [newDigest, ...state.digests],
    events: [digestEvent, ...state.events],
  }
  writeState(updated)

  publishRecipeStream(b.recipeId, 'bundle.digest_submitted', {
    bundleId: b.id,
    digestId: newDigest.id,
  })

  return clone(newDigest)
}
