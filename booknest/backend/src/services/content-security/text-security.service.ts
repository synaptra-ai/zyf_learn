import crypto from 'node:crypto'
import { getWechatAccessToken } from '../wechat/wechat-token.service'
import prisma from '../../lib/prisma'

export async function checkTextSecurity(input: {
  content: string
  userId: string
  workspaceId?: string
  targetType: string
  targetId?: string
  openid?: string
}) {
  const contentHash = crypto.createHash('sha256').update(input.content).digest('hex')

  if (process.env.CONTENT_SECURITY_MODE === 'mock') {
    const risky = /敏感|违法|spam/i.test(input.content)
    return saveCheck(input, contentHash, risky ? 'REJECT' : 'PASS', { mock: true })
  }

  const token = await getWechatAccessToken()
  const res = await fetch(
    `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: input.content,
        version: 2,
        scene: 1,
        openid: input.openid,
      }),
    },
  )

  const result = await res.json()
  const status = normalizeWechatSecurityResult(result)
  return saveCheck(input, contentHash, status, result)
}

function normalizeWechatSecurityResult(result: any) {
  if (result.errcode === 0 && result.result?.suggest === 'pass') return 'PASS'
  if (result.result?.suggest === 'review') return 'REVIEW'
  if (result.result?.suggest === 'risky') return 'REJECT'
  return 'ERROR'
}

async function saveCheck(
  input: {
    content: string
    userId: string
    workspaceId?: string
    targetType: string
    targetId?: string
  },
  contentHash: string,
  status: string,
  rawResult: any,
) {
  return prisma.contentSecurityCheck.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      targetType: input.targetType,
      targetId: input.targetId,
      contentType: 'TEXT',
      contentHash,
      status,
      rawResult,
    },
  })
}
