import { expect, test } from '@playwright/test'

test.describe('Cookrew workspace', () => {
  test('renders the main panels and defaults', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Cookbook' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Chat' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Bundle Timeline' })
    ).toBeVisible()

    await expect(
      page.getByRole('button', { name: 'platform/core' })
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Selected: Growth Launch')).toBeVisible()
    await expect(page.locator('body')).toContainText('[Bundle C]')
    await expect(page.locator('body')).toContainText('[Bundle B]')
  })

  test('changes the selected bundle and follows chat context', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /Create Spec/i }).click()

    await expect(page.getByText('Selected: Create Spec')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Create Spec/i })
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('body')).toContainText('[Bundle C]')
  })

  test('switches the selected repo', async ({ page }) => {
    await page.goto('/')

    const coreRepo = page.getByRole('button', { name: 'platform/core' })
    const mobileRepo = page.getByRole('button', { name: 'platform/mobile' })

    await expect(coreRepo).toHaveAttribute('aria-pressed', 'true')
    await expect(mobileRepo).toHaveAttribute('aria-pressed', 'false')

    await mobileRepo.click()

    await expect(coreRepo).toHaveAttribute('aria-pressed', 'false')
    await expect(mobileRepo).toHaveAttribute('aria-pressed', 'true')
  })

  test('sends a chat message into the active bundle', async ({ page }) => {
    await page.goto('/')

    const draft = 'Follow up with final QA checklist'
    const composer = page.getByRole('textbox')

    await expect(composer).toBeVisible()
    await composer.fill(draft)
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.locator('body')).toContainText(`You: ${draft}`)
    await expect(composer).toHaveValue('')
  })
})
