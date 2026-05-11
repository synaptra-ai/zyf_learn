import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import { login } from './helpers/auth'

test('用户可以通过编辑页面上传书籍封面', async ({ page }) => {
  await login(page)

  await page.getByText('E2E Seed Book').click()
  await page.getByTestId('edit-book').click()

  const filePath = path.join(__dirname, 'fixtures/cover.png')
  await page.getByTestId('cover-upload-input').setInputFiles(filePath)
  await page.getByTestId('book-submit').click()

  // 回到详情页检查封面
  await expect(page.getByTestId('book-cover-image')).toBeVisible({ timeout: 5000 })
})
