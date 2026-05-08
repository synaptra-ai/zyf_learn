import OSS from 'ali-oss'

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET!,
})

export async function uploadToOSS(
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const key = `covers/${Date.now()}-${filename}`
  await client.put(key, buffer, {
    headers: { 'Content-Type': contentType },
  })
  return `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${key}`
}

export async function deleteFromOSS(url: string): Promise<void> {
  const key = url.split('.com/')[1]
  if (key) {
    await client.delete(key)
  }
}
