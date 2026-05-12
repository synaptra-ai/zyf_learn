import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { code2Session, hashSessionKey } from '../services/wechat/wechat-auth.service'
import { generateToken } from '../services/auth.service'
import { authenticate } from '../middleware/auth'
import { ResponseUtil } from '../utils/response'

export const wechatRouter = Router()

const loginSchema = z.object({
  code: z.string().min(1),
})

wechatRouter.post('/login', async (req, res, next) => {
  try {
    const { code } = loginSchema.parse(req.body)
    const session = await code2Session(code)

    const virtualEmail = `wechat_${crypto.createHash('sha256').update(session.openid).digest('hex').slice(0, 12)}@mini.booknest.local`

    const user = await prisma.user.upsert({
      where: { wechatOpenId: session.openid },
      update: {
        wechatUnionId: session.unionid,
        wechatSessionKeyHash: hashSessionKey(session.session_key),
      },
      create: {
        email: virtualEmail,
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
        name: '微信用户',
        wechatOpenId: session.openid,
        wechatUnionId: session.unionid,
        wechatSessionKeyHash: hashSessionKey(session.session_key),
      },
    })

    const token = generateToken({ id: user.id, email: user.email, role: user.role })

    res.json({
      code: 0,
      message: 'ok',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.name,
          hasWechat: Boolean(user.wechatOpenId),
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

wechatRouter.post('/bind', authenticate, async (req, res, next) => {
  try {
    if (!req.user?.id) throw new Error('未登录')

    const { code } = loginSchema.parse(req.body)
    const session = await code2Session(code)

    const existed = await prisma.user.findUnique({
      where: { wechatOpenId: session.openid },
    })

    if (existed && existed.id !== req.user.id) {
      res.status(409).json({ code: 409, message: '该微信已绑定其他账号', data: null })
      return
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        wechatOpenId: session.openid,
        wechatUnionId: session.unionid,
        wechatSessionKeyHash: hashSessionKey(session.session_key),
        wechatBoundAt: new Date(),
      },
    })

    ResponseUtil.success(res, { userId: user.id })
  } catch (error) {
    next(error)
  }
})
