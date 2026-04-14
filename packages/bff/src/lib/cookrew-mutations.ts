import { normalizeTaskSeeds } from '@cookrew/shared'
import type {
  BundleWithDetails,
  CreateBundleInput,
  CreateRecipeInput,
  DecisionInput,
  Digest,
  Recipe,
} from '@cookrew/shared'
import type { ProxySettings } from '../middleware/proxy-settings'
import {
  KrewHubRequestError,
  hasKrewHubProxy,
  nullOnNotFound,
  requestKrewHub,
} from './krewhub-client'
import {
  normalizeDigest,
  normalizeRecipe,
  type RawBundle,
  type RawDigestResponse,
  type RawRecipe,
} from './normalizers'
import {
  buildDigestSubmission,
  canSubmitDigest,
  submissionToDemoInput,
} from './digest-builder'
import {
  createBundleInDemo,
  createRecipeInDemo,
  decideDigestInDemo,
  getBundleWithDetails,
  rerunBundleInDemo,
  submitDigestInDemo,
} from './demo-store'
import { planTasksFromPrompt } from './task-planner'
import { loadBundleDetailsFromKrewHub } from './cookrew-helpers'

export async function createRecipe(
  input: CreateRecipeInput,
  proxySettings: ProxySettings
): Promise<Recipe> {
  if (!hasKrewHubProxy(proxySettings)) {
    return createRecipeInDemo(input)
  }

  const response = await requestKrewHub<{ recipe: RawRecipe }>(
    '/recipes',
    {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        repo_url: input.repoUrl,
        default_branch: input.defaultBranch,
        created_by: input.createdBy,
        cookbook_id: input.cookbookId,
      }),
    },
    proxySettings
  )

  return normalizeRecipe(response.recipe)
}

export async function createBundle(
  recipeId: string,
  input: CreateBundleInput,
  proxySettings: ProxySettings
): Promise<{ readonly bundleId: string }> {
  const userSeeds = normalizeTaskSeeds(input.taskTitles)

  let tasksPayload: Array<{
    title: string
    description?: string
    depends_on_task_ids?: string[]
    id?: string
  }>

  if (userSeeds.length > 0) {
    tasksPayload = userSeeds.map((title) => ({ title }))
  } else if (hasKrewHubProxy(proxySettings)) {
    tasksPayload = []
  } else {
    const planned = planTasksFromPrompt(input.prompt)
    const taskIds = planned.map((_, i) => `planned_${i}`)
    tasksPayload = planned.map((task, i) => ({
      title: task.title,
      description: task.description,
      depends_on_task_ids: task.dependsOn.map((depIdx) => taskIds[depIdx]),
      id: taskIds[i],
    }))
  }

  if (!hasKrewHubProxy(proxySettings)) {
    const result = createBundleInDemo({
      recipeId,
      prompt: input.prompt,
      requestedBy: input.requestedBy,
      taskTitles: tasksPayload.map((t) => t.title),
    })

    return { bundleId: result.bundle.id }
  }

  const response = await requestKrewHub<{ bundle: RawBundle }>(
    `/recipes/${recipeId}/bundles`,
    {
      method: 'POST',
      body: JSON.stringify({
        prompt: input.prompt,
        requested_by: input.requestedBy,
        tasks: tasksPayload,
      }),
    },
    proxySettings
  )

  return { bundleId: response.bundle.id }
}

export async function rerunBundle(
  recipeId: string,
  bundleId: string,
  proxySettings: ProxySettings
): Promise<BundleWithDetails | null> {
  if (!hasKrewHubProxy(proxySettings)) {
    const updated = rerunBundleInDemo({ bundleId })
    if (!updated || updated.bundle.recipeId !== recipeId) {
      return null
    }
    return updated
  }

  const bundleDetail = await nullOnNotFound(
    loadBundleDetailsFromKrewHub(bundleId, proxySettings)
  )
  if (!bundleDetail || bundleDetail.bundle.recipeId !== recipeId) {
    return null
  }

  await requestKrewHub<{ bundle: RawBundle }>(
    `/bundles/${bundleId}/rerun`,
    { method: 'POST' },
    proxySettings
  )

  return loadBundleDetailsFromKrewHub(bundleId, proxySettings)
}

export async function submitDigest(
  recipeId: string,
  bundleId: string,
  proxySettings: ProxySettings
): Promise<Digest | null> {
  const bundleDetail = hasKrewHubProxy(proxySettings)
    ? await nullOnNotFound(
        loadBundleDetailsFromKrewHub(bundleId, proxySettings)
      )
    : getBundleWithDetails(bundleId)

  if (!bundleDetail || bundleDetail.bundle.recipeId !== recipeId) {
    return null
  }

  if (bundleDetail.digest) {
    return bundleDetail.digest
  }

  if (!canSubmitDigest(bundleDetail)) {
    throw new KrewHubRequestError(
      'Complete or block every task before running a digest.',
      400
    )
  }

  const submission = buildDigestSubmission(bundleDetail)

  if (!hasKrewHubProxy(proxySettings)) {
    return submitDigestInDemo(submissionToDemoInput(bundleId, submission))
  }

  const response = await requestKrewHub<RawDigestResponse>(
    `/bundles/${bundleId}/digest`,
    {
      method: 'POST',
      body: JSON.stringify({
        submitted_by: submission.submittedBy,
        summary: submission.summary,
        task_results: submission.taskResults.map((result) => ({
          task_id: result.taskId,
          outcome: result.outcome,
        })),
        facts: submission.facts.map((fact) => ({
          id: fact.id,
          claim: fact.claim,
          source_url: fact.sourceUrl,
          source_title: fact.sourceTitle,
          captured_by: fact.capturedBy,
          confidence: fact.confidence,
        })),
        code_refs: submission.codeRefs.map((codeRef) => ({
          repo_url: codeRef.repoUrl,
          branch: codeRef.branch,
          commit_sha: codeRef.commitSha,
          paths: codeRef.paths,
        })),
      }),
    },
    proxySettings
  )

  return normalizeDigest(response.digest)
}

export async function decideDigest(
  bundleId: string,
  input: DecisionInput,
  proxySettings: ProxySettings
): Promise<Digest | null> {
  if (!hasKrewHubProxy(proxySettings)) {
    return decideDigestInDemo({
      bundleId,
      decision: input.decision,
      decidedBy: input.decidedBy,
      note: input.note,
    })
  }

  const response = await requestKrewHub<RawDigestResponse>(
    `/bundles/${bundleId}/decision`,
    {
      method: 'POST',
      body: JSON.stringify({
        decision: input.decision,
        decided_by: input.decidedBy,
        note: input.note,
      }),
    },
    proxySettings
  )

  return normalizeDigest(response.digest)
}
