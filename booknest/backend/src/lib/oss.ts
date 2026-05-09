import OSS from 'ali-oss'

let client: OSS | null = null

function getClient(): OSS {
  if (!client) {
    if (!process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET) {
      throw new Error('OSS 未配置，请设置 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET 环境变量')
    }
    client = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET!,
    })
  }
  return client
}

export async function uploadToOSS(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const key = `covers/${Date.now()}-${filename}`
  await getClient().put(key, buffer, {
    headers: { 'Content-Type': contentType },
  })
  return `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${key}`
}

export async function deleteFromOSS(url: string): Promise<void> {
  const key = url.split('.com/')[1]
  if (key) {
    await getClient().delete(key)
  }
}
