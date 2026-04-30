import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { ApiError } from '../utils/errors'

const JWT_SECRET = process.env.JWT_SECRET!

interface TokenPayload {
  id: string
  email: string
  role: string
}

function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export const authService = {
  async register(email: string, password: string, name: string) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ApiError(409, '该邮箱已被注册')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    })

    const token = generateToken({ id: user.id, email: user.email, role: user.role })
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    }
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new ApiError(401, '邮箱或密码错误')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new ApiError(401, '邮箱或密码错误')
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role })
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    }
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
    if (!user) {
      throw new ApiError(404, '用户不存在')
    }
    return user
  },
}
