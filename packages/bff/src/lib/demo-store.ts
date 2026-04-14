import {
  clone,
  createInitialState,
  readState,
  writeState,
} from './demo-state'
import type {
  AgentPresence,
  Bundle,
  BundleWithDetails,
  Digest,
  Recipe,
  RecipeMember,
} from '@cookrew/shared'

// Re-export write operations so consumers can import from a single module
export {
  createRecipeInDemo,
  createBundleInDemo,
  decideDigestInDemo,
  rerunBundleInDemo,
  submitDigestInDemo,
} from './demo-writes'

// ── Read operations ───────────────────────────────────────────────

export function resetDemoState(): void {
  writeState(createInitialState())
}

export function listRecipes(): Recipe[] {
  return clone(readState().recipes)
}

export function getRecipe(recipeId: string): Recipe | null {
  const recipe = readState().recipes.find(
    (entry) => entry.id === recipeId
  )
  return recipe ? clone(recipe) : null
}

export function listMembers(recipeId: string): RecipeMember[] {
  return clone(
    readState().members.filter((entry) => entry.recipeId === recipeId)
  )
}

export function listAgents(cookbookId: string): AgentPresence[] {
  return clone(
    readState().agents.filter((entry) => entry.cookbookId === cookbookId)
  )
}

export function listBundles(recipeId: string): Bundle[] {
  const state = readState()
  return clone(
    state.bundles
      .filter((entry) => entry.recipeId === recipeId)
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt)
      )
  )
}

export function listApprovedDigests(recipeId: string): Digest[] {
  const state = readState()
  return clone(
    state.digests
      .filter(
        (entry) =>
          entry.recipeId === recipeId && entry.decision === 'approved'
      )
      .sort((left, right) =>
        right.submittedAt.localeCompare(left.submittedAt)
      )
  )
}

export function getBundleWithDetails(
  bundleId: string
): BundleWithDetails | null {
  const state = readState()
  const b = state.bundles.find((entry) => entry.id === bundleId)
  if (!b) {
    return null
  }

  const tasks = state.tasks.filter(
    (entry) => entry.bundleId === bundleId
  )
  const events = state.events
    .filter((entry) => entry.bundleId === bundleId)
    .sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    )
  const digest =
    state.digests.find((entry) => entry.bundleId === bundleId) ?? null

  return clone({
    bundle: b,
    tasks,
    events,
    digest,
  })
}
