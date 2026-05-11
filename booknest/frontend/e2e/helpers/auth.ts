import { Page, expect } from '@playwright/test'

export async function login(page: Page, email = 'e2e-a@booknest.com', password = 'password123') {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL(/\/$/)
}
