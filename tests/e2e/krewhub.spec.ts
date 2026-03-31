import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test'

const KREWHUB_BASE_URL = process.env.PLAYWRIGHT_KREWHUB_BASE_URL ?? ''
const KREWHUB_API_KEY = process.env.PLAYWRIGHT_KREWHUB_API_KEY ?? ''

if (!KREWHUB_BASE_URL || !KREWHUB_API_KEY) {
  throw new Error('Expected KrewHub Playwright environment to be configured.')
}

function krewhubHeaders() {
  return {
    'X-API-Key': KREWHUB_API_KEY,
  }
}

async function readJson<T>(response: APIResponse): Promise<T> {
  return (await response.json()) as T
}

async function postJson<T>(
  request: APIRequestContext,
  path: string,
  data: unknown
): Promise<T> {
  const response = await request.post(`${KREWHUB_BASE_URL}${path}`, {
    headers: krewhubHeaders(),
    data,
  })

  if (!response.ok()) {
    throw new Error(
      `POST ${path} failed with ${response.status()}: ${await response.text()}`
    )
  }

  return readJson<T>(response)
}

async function patchJson<T>(
  request: APIRequestContext,
  path: string,
  data: unknown
): Promise<T> {
  const response = await request.patch(`${KREWHUB_BASE_URL}${path}`, {
    headers: krewhubHeaders(),
    data,
  })

  if (!response.ok()) {
    throw new Error(
      `PATCH ${path} failed with ${response.status()}: ${await response.text()}`
    )
  }

  return readJson<T>(response)
}

async function getJson<T>(
  request: APIRequestContext,
  path: string
): Promise<T> {
  const response = await request.get(`${KREWHUB_BASE_URL}${path}`, {
    headers: krewhubHeaders(),
  })

  if (!response.ok()) {
    throw new Error(
      `GET ${path} failed with ${response.status()}: ${await response.text()}`
    )
  }

  return readJson<T>(response)
}

async function seedPendingDigest(request: APIRequestContext) {
  const recipeName = `playwright-krewhub-${Date.now()}`

  const recipe = await postJson<{ recipe: { id: string } }>(
    request,
    '/api/v1/recipes',
    {
      name: recipeName,
      repo_url: 'git@github.com:test/playwright-krewhub.git',
      created_by: 'qa.lead',
    }
  )

  const bundle = await postJson<{
    bundle: { id: string }
    tasks: Array<{ id: string }>
  }>(request, `/api/v1/recipes/${recipe.recipe.id}/bundles`, {
    prompt: 'Validate the real KrewHub-backed Cookrew digest review path.',
    requested_by: 'qa.lead',
    tasks: [{ title: 'Confirm digest proxy wiring' }, { title: 'Approve via UI' }],
  })

  for (const [index, task] of bundle.tasks.entries()) {
    await postJson(request, `/api/v1/tasks/${task.id}/claim`, {
      agent_id: `agent_${index + 1}`,
    })
    await patchJson(request, `/api/v1/tasks/${task.id}/status`, {
      status: 'done',
    })
  }

  await postJson(request, `/api/v1/bundles/${bundle.bundle.id}/digest`, {
    submitted_by: 'agent_1',
    summary: 'KrewHub-backed digest is ready for a browser approval flow.',
    task_results: bundle.tasks.map((task) => ({
      task_id: task.id,
      outcome: 'Done',
    })),
    facts: [
      {
        id: 'fact_playwright_proxy',
        claim: 'Cookrew can proxy digest review data from a live KrewHub server.',
        captured_by: 'agent_1',
      },
    ],
    code_refs: [
      {
        repo_url: 'git@github.com:test/playwright-krewhub.git',
        branch: 'main',
        commit_sha: 'abc1234',
        paths: ['cookrew/tests/e2e/krewhub.spec.ts'],
      },
    ],
  })

  return {
    bundleId: bundle.bundle.id,
    recipeId: recipe.recipe.id,
    recipeName,
  }
}

function readRecipeIdFromUrl(url: string): string {
  const pathname = new URL(url).pathname
  const segments = pathname.split('/').filter(Boolean)
  const recipeId = segments[1]

  if (!recipeId) {
    throw new Error(`Unable to read recipe id from ${url}`)
  }

  return recipeId
}

function readBundleIdFromUrl(url: string): string {
  const bundleId = new URL(url).searchParams.get('bundle')
  if (!bundleId) {
    throw new Error(`Unable to read bundle id from ${url}`)
  }

  return bundleId
}

test.describe('Cookrew with live KrewHub proxy', () => {
  test('creates a live recipe, streams workspace updates, and approves the digest', async ({
    page,
    request,
  }) => {
    const recipeName = `playwright-live-${Date.now()}`

    await page.goto('/')
    await page.getByRole('button', { name: 'Create Recipe' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Recipe Name').fill(recipeName)
    await dialog.getByLabel('Default Branch').fill('release/playwright')
    await dialog
      .getByLabel('Repository URL')
      .fill('git@github.com:test/playwright-live.git')
    await dialog.getByLabel('Created By').fill('qa.lead')
    await dialog.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/recipes\/rec_/)
    await expect(page.getByRole('heading', { name: recipeName })).toBeVisible()

    const recipeId = readRecipeIdFromUrl(page.url())

    await page.goto('/')
    await expect(page.getByRole('button', { name: new RegExp(recipeName) })).toBeVisible()

    await page.goto(`/recipes/${recipeId}`)
    await page
      .getByLabel('Prompt')
      .fill('Ship the live KrewHub-backed integration flow for Phase 4.')
    await page.getByRole('button', { name: 'Add task seeds' }).click()
    await page
      .getByLabel('Optional Task Seeds')
      .fill('Bring the agent online\nPost milestone evidence')
    await page.getByRole('button', { name: 'Open Bundle' }).click()

    await expect(page).toHaveURL(/bundle=bun_/)
    await expect(page.getByText('Bring the agent online')).toBeVisible()
    await expect(page.getByText('Post milestone evidence')).toBeVisible()

    const bundleId = readBundleIdFromUrl(page.url())

    await postJson(request, '/api/v1/agents/heartbeat', {
      agent_id: 'codex_phase4',
      recipe_id: recipeId,
      display_name: 'Codex Phase 4',
      capabilities: ['claim', 'milestones', 'digests'],
    })

    await expect(page.getByText('Codex Phase 4')).toBeVisible()

    const bundleDetail = await getJson<{
      tasks: Array<{ id: string }>
    }>(request, `/api/v1/bundles/${bundleId}`)

    await postJson(request, `/api/v1/tasks/${bundleDetail.tasks[0].id}/claim`, {
      agent_id: 'codex_phase4',
    })

    await expect(page.getByText('Task Claimed')).toBeVisible()

    await postJson(request, `/api/v1/tasks/${bundleDetail.tasks[0].id}/events`, {
      type: 'milestone',
      actor_id: 'codex_phase4',
      body: 'Milestone posted from the live browser integration test.',
      facts: [
        {
          id: 'fact_browser_phase4',
          claim: 'Browser test can see milestone events from the live backend.',
          captured_by: 'codex_phase4',
        },
      ],
      code_refs: [
        {
          repo_url: 'git@github.com:test/playwright-live.git',
          branch: 'release/playwright',
          commit_sha: 'abc1234',
          paths: ['cookrew/tests/e2e/krewhub.spec.ts'],
        },
      ],
    })

    await expect(
      page.getByText('Milestone posted from the live browser integration test.')
    ).toBeVisible()

    for (const task of bundleDetail.tasks) {
      await patchJson(request, `/api/v1/tasks/${task.id}/status`, {
        status: 'done',
      })
    }

    await expect(page.getByText('cooked').first()).toBeVisible()

    await postJson(request, `/api/v1/bundles/${bundleId}/digest`, {
      submitted_by: 'codex_phase4',
      summary: 'Cookrew can drive the full live integration loop.',
      task_results: bundleDetail.tasks.map((task) => ({
        task_id: task.id,
        outcome: 'Done',
      })),
      facts: [
        {
          id: 'fact_digest_browser_phase4',
          claim: 'Digest review becomes available after the bundle is cooked.',
          captured_by: 'codex_phase4',
        },
      ],
      code_refs: [
        {
          repo_url: 'git@github.com:test/playwright-live.git',
          branch: 'release/playwright',
          commit_sha: 'abc1234',
          paths: ['cookrew/tests/e2e/krewhub.spec.ts'],
        },
      ],
    })

    const reviewLink = page.getByRole('link', { name: 'Review Digest' })
    await expect(reviewLink).toBeVisible()
    await reviewLink.click()

    await expect(page.getByText('Digest Summary')).toBeVisible()
    await page.getByLabel('Reviewer').fill('qa.lead')
    await page
      .getByLabel('Decision Note')
      .fill('Approve the live Cookrew, KrewCLI, and KrewHub integration path.')
    await page.getByRole('button', { name: 'Approve Digest' }).click()

    await expect(page).toHaveURL(`/recipes/${recipeId}/history`)
    await expect(page.getByText('Approved Digest Records')).toBeVisible()
    await expect(page.getByText(bundleId)).toBeVisible()

    const history = await getJson<{
      digests: Array<{ bundle_id: string; decision: string }>
    }>(request, `/api/v1/recipes/${recipeId}/digests`)

    expect(
      history.digests.some(
        (digest) =>
          digest.bundle_id === bundleId && digest.decision === 'approved'
      )
    ).toBe(true)
  })

  test('approves a real backend digest and shows it in history', async ({
    page,
    request,
  }) => {
    const seed = await seedPendingDigest(request)

    await page.goto(`/recipes/${seed.recipeId}/bundles/${seed.bundleId}/digest`)

    await expect(
      page.getByRole('heading', { name: seed.recipeName })
    ).toBeVisible()
    await expect(page.getByText('Digest Summary')).toBeVisible()

    await page.getByLabel('Reviewer').fill('qa.lead')
    await page
      .getByLabel('Decision Note')
      .fill('Approve via the real backend proxy path.')
    await page.getByRole('button', { name: 'Approve Digest' }).click()

    await expect(page).toHaveURL(`/recipes/${seed.recipeId}/history`)
    await expect(page.getByText('Approved Digest Records')).toBeVisible()
    await expect(page.getByText(seed.bundleId)).toBeVisible()

    const history = await getJson<{
      digests: Array<{ bundle_id: string; decision: string }>
    }>(request, `/api/v1/recipes/${seed.recipeId}/digests`)

    expect(
      history.digests.some(
        (digest) =>
          digest.bundle_id === seed.bundleId && digest.decision === 'approved'
      )
    ).toBe(true)
  })
})
