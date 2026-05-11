import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('Book CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('创建、搜索、编辑、删除书籍', async ({ page }) => {
    const uniqueTitle = `E2E Book ${Date.now()}`

    // 创建
    await page.getByTestId('create-book-link').click()
    await page.getByTestId('book-title').fill(uniqueTitle)
    await page.getByTestId('book-author').fill('Playwright Author')
    await page.getByTestId('book-page-count').fill('256')
    await page.getByTestId('book-status').selectOption('READING')
    await page.getByTestId('book-submit').click()

    // 等待跳转到详情页，标题可见
    await expect(page.getByText(uniqueTitle)).toBeVisible()

    // 返回列表并搜索
    await page.goto('/')
    await page.getByTestId('book-search').fill(uniqueTitle)
    await expect(page.getByText(uniqueTitle)).toBeVisible()

    // 进入详情
    await page.getByText(uniqueTitle).first().click()
    await expect(page.getByText('Playwright Author')).toBeVisible()

    // 编辑
    await page.getByTestId('edit-book').click()
    await page.getByTestId('book-title').fill(`${uniqueTitle} Updated`)
    await page.getByTestId('book-submit').click()
    await expect(page.getByText(`${uniqueTitle} Updated`)).toBeVisible()

    // 删除
    await page.getByTestId('delete-book').click()
    await page.getByTestId('modal-confirm').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('book-list').getByText(`${uniqueTitle} Updated`)).not.toBeVisible()
  })
})
