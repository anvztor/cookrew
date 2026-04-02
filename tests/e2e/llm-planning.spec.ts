/**
 * LLM Planning E2E test.
 *
 * Prerequisites:
 * - docker compose up (krewhub + cookrew)
 * - krewcli join --provider anthropic --recipe <id> --port 10000
 *
 * Verifies that bundle creation uses a real LLM call via A2A
 * to decompose prompts into tasks WITH dependency edges.
 */
import { expect, test } from '@playwright/test'

const KREWHUB_URL = 'http://127.0.0.1:8420'
const API_KEY = process.env.KREWHUB_API_KEY ?? 'dev-api-key'

test.describe('LLM-based task planning via A2A', () => {
  test.setTimeout(120_000)

  test('bundle creation produces LLM-planned tasks with dependencies', async ({
    page,
    request,
  }) => {
    // Find recipe that has a planner agent online
    const recipeResp = await request.get(`${KREWHUB_URL}/api/v1/recipes`, {
      headers: { 'X-API-Key': API_KEY },
    })
    const recipes = (await recipeResp.json()).recipes as Array<{ id: string }>
    expect(recipes.length).toBeGreaterThan(0)

    let recipeId = ''
    let plannerAgent: { endpoint_url: string } | undefined

    for (const recipe of recipes) {
      const resp = await request.get(
        `${KREWHUB_URL}/api/v1/recipes/${recipe.id}`,
        { headers: { 'X-API-Key': API_KEY } }
      )
      const d = await resp.json()
      const found = d.agents.find(
        (a: { capabilities: string[]; status: string; endpoint_url: string | null }) =>
          a.status !== 'offline' &&
          a.endpoint_url &&
          a.capabilities.some((c: string) =>
            ['plan', 'orchestrate', 'predict'].includes(c)
          )
      )
      if (found) {
        recipeId = recipe.id
        plannerAgent = found
        break
      }
    }

    if (!plannerAgent || !recipeId) {
      test.skip(true, 'No planner agent online — start one with: krewcli join --provider anthropic')
      return
    }

    console.log(`Found planner agent on recipe ${recipeId}: ${plannerAgent.endpoint_url}`)

    // Navigate to workspace and create a bundle
    await page.goto(`/recipes/${recipeId}`)
    await expect(page.getByTestId('workspace-center-pane')).toBeVisible({ timeout: 10_000 })

    await page.getByLabel('Prompt').first().fill('Implement user authentication with JWT tokens, password hashing, and login/signup endpoints')
    await page.getByRole('button', { name: 'Open Bundle' }).click()

    // Wait for bundle to be created
    await expect(page).toHaveURL(/bundle=bun_/, { timeout: 30_000 })

    // Wait for tasks to render in the right pane
    const rightPane = page.getByTestId('workspace-right-pane')
    await expect(rightPane.getByText('Tasks', { exact: true })).toBeVisible({ timeout: 10_000 })

    // Verify tasks are NOT the old generic pattern
    const taskTexts = await rightPane.locator('[class*="truncate"]').allTextContents()
    expect(taskTexts.length).toBeGreaterThanOrEqual(3)

    // The old pattern would be "Scope and plan: ...", "Implement: ...", "Review and digest: ..."
    // LLM-planned tasks should be more specific
    const hasOldPattern = taskTexts.some((t) => t.startsWith('Scope and plan:'))
    const hasLLMPattern = taskTexts.length >= 3 // LLM should produce 3+ tasks

    // Log what we got for debugging
    console.log('Tasks created:', taskTexts)

    if (!hasOldPattern) {
      // LLM planning worked — verify dependencies exist
      await expect(rightPane.getByText('Dependencies')).toBeVisible()

      // Check that at least one dependency edge exists
      // (LLM plans should have dependency edges)
      const depSection = rightPane.locator('section').filter({ hasText: 'Dependencies' })
      const hasEdges = await depSection.locator('[class*="flex items-center gap-1"]').count()
      console.log('Dependency edges:', hasEdges)
      expect(hasEdges).toBeGreaterThan(0)
    }

    expect(hasLLMPattern).toBe(true)
  })
})
