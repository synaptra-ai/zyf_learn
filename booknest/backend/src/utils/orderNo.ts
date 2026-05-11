export function generateOrderNo() {
  const date = new Date()
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `BN${ymd}${random}`
}
