import { calculateMedian } from '@cookrew/shared'
import type {
  AgentPresence,
  Bundle,
  BundleWithDetails,
  Digest,
  Recipe,
  RecipeMember,
  RecipeSummary,
} from '@cookrew/shared'
import type { ProxySettings } from '../middleware/proxy-settings'
import { nullOnNotFound, requestKrewHub } from './krewhub-client'
import {
  normalizeBundle,
  normalizeDigest,
  normalizeEvent,
  normalizeTask,
  type RawBundleDetailResponse,
  type RawDigestResponse,
} from './normalizers'

export function selectBundleId(
  bundles: readonly Bundle[],
  requestedBundleId?: string | null
): string | null {
  if (
    requestedBundleId &&
    bundles.some((bundle) => bundle.id === requestedBundleId)
  ) {
    return requestedBundleId
  }

  return (
    bundles.find((bundle) =>
      ['claimed', 'open', 'cooked', 'blocked'].includes(bundle.status)
    )?.id ??
    bundles[0]?.id ??
    null
  )
}

export function buildSummary(input: {
  readonly recipe: Recipe
  readonly members: readonly RecipeMember[]
  readonly agents: readonly AgentPresence[]
  readonly bundles: readonly Bundle[]
  readonly digests: readonly Digest[]
}): RecipeSummary {
  const owners = input.members
    .filter((member) => member.role === 'owner')
    .map((member) => member.actorId)

  const activeBundle =
    input.bundles.find((bundle) =>
      ['open', 'claimed', 'cooked', 'blocked'].includes(bundle.status)
    ) ?? null

  return {
    recipe: input.recipe,
    memberCount: input.members.length,
    agentCount: input.agents.length,
    onlineAgentCount: input.agents.filter(
      (agent) => agent.status !== 'offline'
    ).length,
    activeBundleCount: input.bundles.filter((bundle) =>
      ['open', 'claimed', 'cooked', 'blocked'].includes(bundle.status)
    ).length,
    owners,
    activeBundle,
    latestDigest: input.digests[0] ?? null,
  }
}

export function buildHistoryMetrics(digests: readonly Digest[]) {
  const reviewDurations = digests
    .filter((digest) => Boolean(digest.decidedAt))
    .map((digest) => {
      const submittedAt = new Date(digest.submittedAt).getTime()
      const decidedAt = new Date(
        digest.decidedAt ?? digest.submittedAt
      ).getTime()
      return Math.max(1, Math.round((decidedAt - submittedAt) / 60000))
    })

  return {
    approvedCount: digests.length,
    medianReviewMinutes: calculateMedian(reviewDurations),
    mostRecentApprovalAt: digests[0]?.decidedAt ?? null,
  }
}

export async function loadBundleDetailsFromKrewHub(
  bundleId: string,
  proxySettings: ProxySettings
): Promise<BundleWithDetails | null> {
  const [bundleResponse, digestResponse] = await Promise.all([
    requestKrewHub<RawBundleDetailResponse>(
      `/bundles/${bundleId}`,
      undefined,
      proxySettings
    ),
    nullOnNotFound(
      requestKrewHub<RawDigestResponse>(
        `/bundles/${bundleId}/digest`,
        undefined,
        proxySettings
      )
    ),
  ])

  return {
    bundle: normalizeBundle(bundleResponse.bundle),
    tasks: bundleResponse.tasks.map(normalizeTask),
    events: bundleResponse.events.map(normalizeEvent),
    digest: digestResponse ? normalizeDigest(digestResponse.digest) : null,
  }
}
