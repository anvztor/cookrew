import type {
  CookbookData,
  CookbookDetailData,
  DigestReviewData,
  HistoryData,
  HistoryRecord,
  RecipeMember,
  WorkspaceData,
} from '@cookrew/shared'
import type { ProxySettings } from '../middleware/proxy-settings'
import { hasKrewHubProxy, nullOnNotFound, requestKrewHub } from './krewhub-client'
import {
  normalizeAgent,
  normalizeBundle,
  normalizeDigest,
  normalizeMember,
  normalizeRecipe,
  type RawCookbook,
  type RawCookbookDetailResponse,
  type RawCookbooksResponse,
  type RawRecipeDetailResponse,
  type RawRecipesResponse,
} from './normalizers'
import {
  buildHistoryMetrics,
  buildSummary,
  loadBundleDetailsFromKrewHub,
  selectBundleId,
} from './cookrew-helpers'
import {
  getBundleWithDetails,
  getRecipe,
  listAgents,
  listApprovedDigests,
  listBundles,
  listMembers,
  listRecipes,
} from './demo-store'

export async function listCookbookData(
  proxySettings: ProxySettings
): Promise<CookbookData> {
  if (!hasKrewHubProxy(proxySettings)) {
    const recipes = listRecipes()
    const cookbookMap = new Map<string, typeof recipes>()
    for (const recipe of recipes) {
      const cbId = recipe.cookbookId
      const group = cookbookMap.get(cbId) ?? []
      cookbookMap.set(cbId, [...group, recipe])
    }

    const cookbooks = Array.from(cookbookMap.entries()).map(
      ([cbId, cbRecipes]) => ({
        cookbook: {
          id: cbId,
          name: cbId,
          ownerId: 'demo',
          createdAt: cbRecipes[0].createdAt,
        },
        recipes: cbRecipes.map((recipe) =>
          buildSummary({
            recipe,
            members: listMembers(recipe.id),
            agents: listAgents(recipe.cookbookId),
            bundles: listBundles(recipe.id),
            digests: listApprovedDigests(recipe.id),
          })
        ),
        agents: listAgents(cbId),
      })
    )

    return {
      cookbooks,
      selectedRecipeId: recipes[0]?.id ?? null,
    }
  }

  const rawRecipes = await requestKrewHub<RawRecipesResponse>(
    '/recipes',
    undefined,
    proxySettings
  )
  const summaries = await Promise.all(
    rawRecipes.recipes.map(async (recipe) => {
      const detail = await requestKrewHub<RawRecipeDetailResponse>(
        `/recipes/${recipe.id}`,
        undefined,
        proxySettings
      )
      return buildSummary({
        recipe: normalizeRecipe(detail.recipe),
        members: detail.members.map(normalizeMember),
        agents: detail.agents.map(normalizeAgent),
        bundles: detail.bundles.map(normalizeBundle),
        digests: detail.digests.map(normalizeDigest),
      })
    })
  )

  let rawCookbooks: RawCookbook[] = []
  try {
    const cbResponse = await requestKrewHub<RawCookbooksResponse>(
      '/cookbooks',
      undefined,
      proxySettings
    )
    rawCookbooks = [...cbResponse.cookbooks]
  } catch {
    // KrewHub may not have cookbooks yet
  }

  const cookbookGroups = await Promise.all(
    rawCookbooks.map(async (cb) => {
      const detail = await requestKrewHub<RawCookbookDetailResponse>(
        `/cookbooks/${cb.id}`,
        undefined,
        proxySettings
      )
      const cbRecipeIds = new Set(detail.recipes.map((r) => r.id))
      return {
        cookbook: {
          id: cb.id,
          name: cb.name,
          ownerId: cb.owner_id,
          createdAt: cb.created_at,
        },
        recipes: summaries.filter((s) => cbRecipeIds.has(s.recipe.id)),
        agents: detail.agents.map(normalizeAgent),
      }
    })
  )

  return {
    cookbooks: cookbookGroups,
    selectedRecipeId: summaries[0]?.recipe.id ?? null,
  }
}

export async function getCookbookDetailData(
  cookbookId: string,
  proxySettings: ProxySettings
): Promise<CookbookDetailData | null> {
  if (!hasKrewHubProxy(proxySettings)) {
    const recipes = listRecipes()
    const cbRecipes = recipes.filter((r) => r.cookbookId === cookbookId)
    if (cbRecipes.length === 0) {
      return null
    }

    const allMembers = cbRecipes.flatMap((r) => listMembers(r.id))

    return {
      cookbook: {
        id: cookbookId,
        name: cookbookId,
        ownerId: 'demo',
        createdAt: cbRecipes[0].createdAt,
      },
      recipes: cbRecipes.map((recipe) =>
        buildSummary({
          recipe,
          members: listMembers(recipe.id),
          agents: listAgents(recipe.cookbookId),
          bundles: listBundles(recipe.id),
          digests: listApprovedDigests(recipe.id),
        })
      ),
      agents: listAgents(cookbookId),
      members: allMembers,
    }
  }

  const detail = await nullOnNotFound(
    requestKrewHub<RawCookbookDetailResponse>(
      `/cookbooks/${cookbookId}`,
      undefined,
      proxySettings
    )
  )
  if (!detail) {
    return null
  }

  const recipeDetails = await Promise.all(
    detail.recipes.map((raw) =>
      requestKrewHub<RawRecipeDetailResponse>(
        `/recipes/${raw.id}`,
        undefined,
        proxySettings
      )
    )
  )

  const recipes = recipeDetails.map((rd) =>
    buildSummary({
      recipe: normalizeRecipe(rd.recipe),
      members: rd.members.map(normalizeMember),
      agents: rd.agents.map(normalizeAgent),
      bundles: rd.bundles.map(normalizeBundle),
      digests: rd.digests.map(normalizeDigest),
    })
  )

  const allMembers = recipeDetails.flatMap((rd) =>
    rd.members.map(normalizeMember)
  )

  const seenActors = new Set<string>()
  const uniqueMembers: RecipeMember[] = []
  for (const member of allMembers) {
    if (!seenActors.has(member.actorId)) {
      seenActors.add(member.actorId)
      uniqueMembers.push(member)
    }
  }

  return {
    cookbook: {
      id: detail.cookbook.id,
      name: detail.cookbook.name,
      ownerId: detail.cookbook.owner_id,
      createdAt: detail.cookbook.created_at,
    },
    recipes,
    agents: detail.agents.map(normalizeAgent),
    members: uniqueMembers,
  }
}

export async function getWorkspaceData(
  recipeId: string,
  requestedBundleId: string | null | undefined,
  proxySettings: ProxySettings
): Promise<WorkspaceData | null> {
  if (!hasKrewHubProxy(proxySettings)) {
    const recipe = getRecipe(recipeId)
    if (!recipe) {
      return null
    }

    const bundles = listBundles(recipeId)
    const selectedBundleId = selectBundleId(bundles, requestedBundleId)

    return {
      recipe,
      members: listMembers(recipeId),
      agents: listAgents(recipe.cookbookId),
      bundles,
      recentDigests: listApprovedDigests(recipeId).slice(0, 4),
      selectedBundleId,
      selectedBundle: selectedBundleId
        ? getBundleWithDetails(selectedBundleId)
        : null,
    }
  }

  const detail = await nullOnNotFound(
    requestKrewHub<RawRecipeDetailResponse>(
      `/recipes/${recipeId}`,
      undefined,
      proxySettings
    )
  )
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
      ? await loadBundleDetailsFromKrewHub(selectedBundleId, proxySettings)
      : null,
  }
}

export async function getDigestReviewData(
  recipeId: string,
  bundleId: string,
  proxySettings: ProxySettings
): Promise<DigestReviewData | null> {
  if (!hasKrewHubProxy(proxySettings)) {
    const recipe = getRecipe(recipeId)
    const selectedBundle = getBundleWithDetails(bundleId)
    if (!recipe || !selectedBundle) {
      return null
    }

    return { recipe, selectedBundle }
  }

  const [recipeDetail, bundleDetail] = await Promise.all([
    nullOnNotFound(
      requestKrewHub<RawRecipeDetailResponse>(
        `/recipes/${recipeId}`,
        undefined,
        proxySettings
      )
    ),
    nullOnNotFound(loadBundleDetailsFromKrewHub(bundleId, proxySettings)),
  ])

  if (!recipeDetail || !bundleDetail) {
    return null
  }

  return {
    recipe: normalizeRecipe(recipeDetail.recipe),
    selectedBundle: bundleDetail,
  }
}

export async function getHistoryData(
  recipeId: string,
  proxySettings: ProxySettings
): Promise<HistoryData | null> {
  if (!hasKrewHubProxy(proxySettings)) {
    const recipe = getRecipe(recipeId)
    if (!recipe) {
      return null
    }

    const digests = listApprovedDigests(recipeId)
    const bundles = listBundles(recipeId)
    const records: HistoryRecord[] = digests.map((digest) => ({
      digest,
      bundle:
        bundles.find((bundle) => bundle.id === digest.bundleId) ?? null,
    }))

    return {
      recipe,
      metrics: buildHistoryMetrics(digests),
      records,
    }
  }

  const detail = await nullOnNotFound(
    requestKrewHub<RawRecipeDetailResponse>(
      `/recipes/${recipeId}`,
      undefined,
      proxySettings
    )
  )
  if (!detail) {
    return null
  }

  const bundles = detail.bundles.map(normalizeBundle)
  const digests = detail.digests.map(normalizeDigest)
  const records: HistoryRecord[] = digests.map((digest) => ({
    digest,
    bundle:
      bundles.find((bundle) => bundle.id === digest.bundleId) ?? null,
  }))

  return {
    recipe: normalizeRecipe(detail.recipe),
    metrics: buildHistoryMetrics(digests),
    records,
  }
}
