import crypto from 'node:crypto'
import { getWechatAccessToken } from '../wechat/wechat-token.service'
import prisma from '../../lib/prisma'

export async function checkImageSecurity(input: {
  imageUrl: string
  userId: string
  workspaceId?: string
  targetType: string
  targetId?: string
  openid?: string
}) {
  if (process.env.CONTENT_SECURITY_MODE === 'mock') {
    const risky = input.imageUrl.includes('banned')
    return saveImageCheck(input, risky ? 'REJECT' : 'PASS', { mock: true })
  }

  const token = await getWechatAccessToken()
  const res = await fetch(
    `https://api.weixin.qq.com/wxa/img_sec_check?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_url: input.imageUrl,
        version: 2,
        scene: 1,
        openid: input.openid,
      }),
    },
  )

  const result = await res.json()
  const status = normalizeImageResult(result)
  return saveImageCheck(input, status, result)
}

function normalizeImageResult(result: any) {
  if (result.errcode === 0 && result.result?.suggest === 'pass') return 'PASS'
  if (result.result?.suggest === 'review') return 'REVIEW'
  if (result.result?.suggest === 'risky') return 'REJECT'
  return 'ERROR'
}

async function saveImageCheck(
  input: {
    imageUrl: string
    userId: string
    workspaceId?: string
    targetType: string
    targetId?: string
  },
  status: string,
  rawResult: any,
) {
  const contentHash = crypto
    .createHash('sha256')
    .update(input.imageUrl)
    .digest('hex')

  return prisma.contentSecurityCheck.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      targetType: input.targetType,
      targetId: input.targetId,
      contentType: 'IMAGE',
      contentHash,
      status,
      rawResult,
    },
  })
}
