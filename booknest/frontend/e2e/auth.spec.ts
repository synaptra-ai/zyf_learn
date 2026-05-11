import { test, expect } from '@playwright/test'

test.describe('Auth', () => {
  test('用户可以登录并退出', async ({ page }) => {
    await page.goto('/login')

    await page.getByTestId('login-email').fill('e2e-a@booknest.com')
    await page.getByTestId('login-password').fill('password123')
    await page.getByTestId('login-submit').click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('E2E Seed Book')).toBeVisible()

    await page.getByTestId('logout-button').click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('错误密码会显示错误提示', async ({ page }) => {
    await page.goto('/login')

    await page.getByTestId('login-email').fill('e2e-a@booknest.com')
    await page.getByTestId('login-password').fill('wrong-password')
    await page.getByTestId('login-submit').click()

    await expect(page.getByText(/密码|登录失败|认证失败/)).toBeVisible()
  })
})
