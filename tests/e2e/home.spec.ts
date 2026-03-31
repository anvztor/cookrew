import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([
    {
      name: 'cookrew_mode',
      value: 'demo',
      url: 'http://127.0.0.1:3210',
    },
  ])
  await page.goto('/api/demo/reset')
})

test.describe('Cookrew Phase 3', () => {
  test('renders the cookbook route with recipe summaries and actions', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'Cookrew / Cookbook' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /platform-core/i }).first()
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Recipe' })).toBeVisible()
    await expect(page.getByText('Selected Repo')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open' }).first()).toBeVisible()
  })

  test('creates a recipe from the cookbook flow and routes to the workspace', async ({
    page,
  }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Create Recipe' }).click()
    await expect(
      page.getByRole('heading', { name: 'Create Recipe' })
    ).toBeVisible()

    await page.getByLabel('Recipe Name').fill('reschedule-lab')
    await page.getByLabel('Default Branch').fill('main')
    await page
      .getByLabel('Repository URL')
      .fill('git@github.com:krew/reschedule-lab.git')
    await page.getByLabel('Created By').fill('planner.local')
    await page.getByRole('button', { name: 'Create Recipe' }).last().click()

    await expect(page).toHaveURL(/\/recipes\/rec_/)
    await expect(
      page.getByRole('heading', { name: 'reschedule-lab' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'COOKREW / RECIPE WORKSPACE' })
    ).toBeVisible()
    await expect(
      page.getByTestId('workspace-center-pane').getByText('Event Feed', {
        exact: true,
      })
    ).toBeVisible()
  })

  test('opens a new bundle from the workspace composer', async ({ page }) => {
    await page.goto('/recipes/rec_platform')

    await expect(
      page.getByRole('heading', { name: 'platform-core' })
    ).toBeVisible()
    await expect(
      page.getByTestId('workspace-center-pane').getByText('Event Feed', {
        exact: true,
      })
    ).toBeVisible()

    await page
      .getByLabel('Prompt')
      .first()
      .fill('Ship the reschedule workflow for Phase 3 with cookbook parity.')
    await page.getByRole('button', { name: 'Add task seeds' }).click()
    await page
      .getByLabel('Optional Task Seeds')
      .first()
      .fill('Model the workspace state\nWire the new history route')
    await page.getByRole('button', { name: 'Open Bundle' }).click()

    await expect(page).toHaveURL(/bundle=/)
    await expect(
      page
        .getByText('Ship the reschedule workflow for Phase 3 with cookbook parity.')
        .first()
    ).toBeVisible()
  })

  test('supports reviewing live traces and rerunning blocked tasks', async ({
    page,
  }) => {
    await page.goto('/recipes/rec_growth?bundle=bun_growth_blocked')

    const rightPane = page.getByTestId('workspace-right-pane')

    await expect(rightPane.getByRole('button', { name: 'Re-Run' })).toBeVisible()
    await expect(rightPane.getByRole('link', { name: 'Review' })).toBeVisible()

    await rightPane.getByRole('link', { name: 'Review' }).click()

    await expect(
      page.getByRole('heading', { name: 'Cookrew / Bundle Review' })
    ).toBeVisible()
    await expect(page.getByText('Awaiting digest')).toBeVisible()
    await expect(
      page.getByText('No digest has been submitted yet. This page is showing the current bundle trace and evidence set.')
    ).toBeVisible()

    await page.getByRole('link', { name: 'Back to Workspace' }).click()
    await expect(page).toHaveURL(/bundle=bun_growth_blocked/)

    await rightPane.getByRole('button', { name: 'Re-Run' }).click()
    await expect(rightPane.getByRole('button', { name: 'Re-Run' })).toHaveCount(0)
    await expect(rightPane.getByRole('link', { name: 'Review' })).toBeVisible()
  })

  test('supports dragging the workspace splitters to resize panes', async ({
    page,
  }) => {
    await page.goto('/recipes/rec_platform')

    const leftPane = page.getByTestId('workspace-left-pane')
    const handle = page.getByLabel('Resize left sidebar')
    const before = await leftPane.boundingBox()
    const handleBox = await handle.boundingBox()

    expect(before).not.toBeNull()
    expect(handleBox).not.toBeNull()

    if (!before || !handleBox) {
      return
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 + 120,
      handleBox.y + handleBox.height / 2,
      { steps: 12 }
    )
    await page.mouse.up()

    const after = await leftPane.boundingBox()

    expect(after).not.toBeNull()

    if (!after) {
      return
    }

    expect(after.width).toBeGreaterThan(before.width + 80)
  })

  test('approves a digest and sees it appear in approved history', async ({
    page,
  }) => {
    await page.goto('/recipes/rec_platform/bundles/bun_platform_pending/digest')

    await expect(
      page.getByRole('heading', { name: 'Cookrew / Bundle Review' })
    ).toBeVisible()
    await expect(page.getByText('Digest Summary')).toBeVisible()

    await page.getByLabel('Reviewer').fill('qa.lead')
    await page
      .getByLabel('Decision Note')
      .fill('Persist this digest and move it into durable history.')
    await page.getByRole('button', { name: 'Approve Digest' }).click()

    await expect(page).toHaveURL('/recipes/rec_platform/history')
    await expect(page.getByText('bun_platform_pending')).toBeVisible()
    await expect(page.getByText('Approved Digest Records')).toBeVisible()
  })
})
