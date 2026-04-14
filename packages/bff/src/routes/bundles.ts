import { Hono } from 'hono'
import { getApiRouteError } from '../lib/krewhub-client'
import {
  createBundle,
  decideDigest,
  getDigestReviewData,
  rerunBundle,
  submitDigest,
} from '../lib/cookrew-data'
import { getProxySettingsFromContext } from '../middleware/proxy-settings'

const bundles = new Hono()

// POST /api/recipes/:recipeId/bundles
bundles.post('/:recipeId/bundles', async (c) => {
  try {
    const recipeId = c.req.param('recipeId')
    const proxySettings = getProxySettingsFromContext(c)
    const body = (await c.req.json()) as {
      prompt?: string
      requestedBy?: string
      taskTitles?: string[]
    }

    if (!body.prompt?.trim() || !body.requestedBy?.trim()) {
      return c.json(
        { error: 'Prompt and requester are required.' },
        400
      )
    }

    const result = await createBundle(
      recipeId,
      {
        prompt: body.prompt.trim(),
        requestedBy: body.requestedBy.trim(),
        taskTitles: body.taskTitles ?? [],
      },
      proxySettings
    )

    return c.json(result, 201)
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to create bundle')
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

// GET /api/recipes/:recipeId/bundles/:bundleId/digest
bundles.get('/:recipeId/bundles/:bundleId/digest', async (c) => {
  try {
    const recipeId = c.req.param('recipeId')
    const bundleId = c.req.param('bundleId')
    const data = await getDigestReviewData(
      recipeId,
      bundleId,
      getProxySettingsFromContext(c)
    )

    if (!data) {
      return c.json({ error: 'Digest review was not found.' }, 404)
    }

    return c.json(data)
  } catch (error) {
    const apiError = getApiRouteError(
      error,
      'Unable to load digest review'
    )
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

// POST /api/recipes/:recipeId/bundles/:bundleId/digest
bundles.post('/:recipeId/bundles/:bundleId/digest', async (c) => {
  try {
    const recipeId = c.req.param('recipeId')
    const bundleId = c.req.param('bundleId')
    const digest = await submitDigest(
      recipeId,
      bundleId,
      getProxySettingsFromContext(c)
    )

    if (!digest) {
      return c.json(
        { error: 'Bundle was not found for this recipe.' },
        404
      )
    }

    return c.json({
      redirectTo: `/recipes/${recipeId}/bundles/${bundleId}/digest`,
    })
  } catch (error) {
    const apiError = getApiRouteError(error, 'Unable to run digest')
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

// POST /api/recipes/:recipeId/bundles/:bundleId/decision
bundles.post('/:recipeId/bundles/:bundleId/decision', async (c) => {
  try {
    const recipeId = c.req.param('recipeId')
    const bundleId = c.req.param('bundleId')
    const proxySettings = getProxySettingsFromContext(c)
    const body = (await c.req.json()) as {
      decision?: 'approved' | 'rejected'
      decidedBy?: string
      note?: string
    }

    if (!body.decision || !body.decidedBy?.trim()) {
      return c.json(
        { error: 'Decision and reviewer are required.' },
        400
      )
    }

    const digest = await decideDigest(
      bundleId,
      {
        decision: body.decision,
        decidedBy: body.decidedBy.trim(),
        note: body.note,
      },
      proxySettings
    )

    if (!digest) {
      return c.json(
        { error: 'Unable to record digest decision.' },
        404
      )
    }

    return c.json({
      redirectTo:
        body.decision === 'approved'
          ? `/recipes/${recipeId}/history`
          : `/recipes/${recipeId}/bundles/${bundleId}/digest`,
    })
  } catch (error) {
    const apiError = getApiRouteError(
      error,
      'Unable to save digest decision'
    )
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

// POST /api/recipes/:recipeId/bundles/:bundleId/rerun
bundles.post('/:recipeId/bundles/:bundleId/rerun', async (c) => {
  try {
    const recipeId = c.req.param('recipeId')
    const bundleId = c.req.param('bundleId')
    const updated = await rerunBundle(
      recipeId,
      bundleId,
      getProxySettingsFromContext(c)
    )

    if (!updated) {
      return c.json(
        { error: 'No blocked tasks are available to rerun.' },
        400
      )
    }

    return c.json({ bundleId: updated.bundle.id })
  } catch (error) {
    const apiError = getApiRouteError(
      error,
      'Unable to re-run blocked tasks'
    )
    return c.json({ error: apiError.error }, apiError.status as 500)
  }
})

export { bundles }
