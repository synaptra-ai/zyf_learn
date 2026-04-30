import bcrypt from 'bcrypt'
import prisma from '../../src/lib/prisma'
import { authService } from '../../src/services/auth.service'
import { ApiError } from '../../src/utils/errors'

describe('AuthService', () => {
  const testEmail = `unit-auth-${Date.now()}@test.com`

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } })
    await prisma.$disconnect()
  })

  test('register: should create user and return token', async () => {
    const result = await authService.register(testEmail, 'password123', 'Unit Test')
    expect(result.user.email).toBe(testEmail)
    expect(result.token).toBeDefined()
    expect(result.user.role).toBe('USER')
  })

  test('register: should throw 409 when email exists', async () => {
    await expect(authService.register(testEmail, 'password123', 'Dup'))
      .rejects.toThrow(ApiError)
    try {
      await authService.register(testEmail, 'password123', 'Dup')
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(409)
    }
  })

  test('login: should return token with correct credentials', async () => {
    const result = await authService.login(testEmail, 'password123')
    expect(result.user.email).toBe(testEmail)
    expect(result.token).toBeDefined()
  })

  test('login: should throw 401 with wrong password', async () => {
    await expect(authService.login(testEmail, 'wrongpassword'))
      .rejects.toThrow(ApiError)
    try {
      await authService.login(testEmail, 'wrongpassword')
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(401)
    }
  })
})
