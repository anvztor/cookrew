import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test'

const KREWHUB_BASE_URL = process.env.PLAYWRIGHT_KREWHUB_BASE_URL
const KREWHUB_API_KEY = process.env.PLAYWRIGHT_KREWHUB_API_KEY

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

test.describe('Cookrew with live KrewHub proxy', () => {
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
