import { Page, expect } from '@playwright/test'

export async function login(page: Page, email = 'e2e-a@booknest.com', password = 'password123') {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/(\?.*)?$/)
  // Dismiss welcome modal
  try {
    await page.getByText('开始使用').click({ timeout: 5000 })
  } catch {
    // Welcome modal not shown
  }
}
