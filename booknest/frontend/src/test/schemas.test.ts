import { describe, it, expect } from 'vitest'
import { bookSchema } from '@/lib/schemas'

describe('bookSchema', () => {
  const validBook = {
    title: '三体',
    author: '刘慈欣',
    status: 'OWNED' as const,
  }

  it('should pass with valid minimal data', () => {
    const result = bookSchema.safeParse(validBook)
    expect(result.success).toBe(true)
  })

  it('should pass with all fields filled', () => {
    const result = bookSchema.safeParse({
      ...validBook,
      isbn: '9787536692930',
      pageCount: 302,
      description: '一部科幻小说',
      categoryId: 'cat-1',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty title', () => {
    const result = bookSchema.safeParse({ ...validBook, title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('书名不能为空')
    }
  })

  it('should reject empty author', () => {
    const result = bookSchema.safeParse({ ...validBook, author: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('作者不能为空')
    }
  })

  it('should reject invalid ISBN', () => {
    const result = bookSchema.safeParse({ ...validBook, isbn: 'abc123' })
    expect(result.success).toBe(false)
  })

  it('should accept valid 10-digit ISBN', () => {
    const result = bookSchema.safeParse({ ...validBook, isbn: '7536692930' })
    expect(result.success).toBe(true)
  })

  it('should accept valid 13-digit ISBN', () => {
    const result = bookSchema.safeParse({ ...validBook, isbn: '9787536692930' })
    expect(result.success).toBe(true)
  })

  it('should accept empty string for optional isbn', () => {
    const result = bookSchema.safeParse({ ...validBook, isbn: '' })
    expect(result.success).toBe(true)
  })

  it('should reject invalid status', () => {
    const result = bookSchema.safeParse({ ...validBook, status: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('should reject title exceeding 200 chars', () => {
    const result = bookSchema.safeParse({ ...validBook, title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('书名不超过200字')
    }
  })
})
