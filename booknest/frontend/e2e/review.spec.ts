import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test('用户可以在书籍详情页提交评论', async ({ page }) => {
  await login(page)

  await page.getByText('E2E Seed Book').click()

  const reviewText = `E2E Review ${Date.now()}`
  await page.getByTestId('review-rating-5').click()
  await page.getByTestId('review-text').fill(reviewText)
  await page.getByTestId('submit-review').click()

  await expect(page.getByText(reviewText)).toBeVisible()
})
