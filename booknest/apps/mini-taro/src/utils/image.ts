export function getCoverThumbUrl(url?: string | null, width = 240) {
  if (!url) return ''
  if (!url.includes('aliyuncs.com')) return url
  return `${url}?x-oss-process=image/resize,w_${width}/quality,q_80/format,webp`
}
