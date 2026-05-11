const API = process.env.API_URL || 'http://localhost:4000/api/v1'

async function api(path: string, options: RequestInit = {}) {
  const token = process.env.TEST_TOKEN
  const workspaceId = process.env.TEST_WORKSPACE_ID
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Workspace-Id': workspaceId!,
      ...(options.headers as Record<string, string> || {}),
    },
  })
  return res.json()
}

async function main() {
  const token = process.env.TEST_TOKEN
  const workspaceId = process.env.TEST_WORKSPACE_ID
  const activityId = process.env.TEST_ACTIVITY_ID

  if (!token || !workspaceId || !activityId) {
    console.error('Usage: TEST_TOKEN=x TEST_WORKSPACE_ID=x TEST_ACTIVITY_ID=x npx tsx scripts/test-concurrency.ts')
    process.exit(1)
  }

  const activityData = await api('/activities')
  const activity = activityData?.data?.find((a: any) => a.id === activityId)
  if (!activity) {
    console.error('Activity not found')
    process.exit(1)
  }

  console.log(`Activity: ${activity.title}`)
  console.log(`Capacity: ${activity.capacity}, Already registered: ${activity.registeredCount}`)
  console.log('Sending 50 concurrent registration + payment requests...\n')

  const CONCURRENT = 50
  const requests = Array.from({ length: CONCURRENT }).map(async (_, i) => {
    try {
      const orderRes = await api('/orders', { method: 'POST', body: JSON.stringify({ activityId }) })
      if (!orderRes.data) return { ok: false, index: i + 1, message: orderRes.message || 'create order failed' }
      const order = orderRes.data
      const payRes = await api(`/payments/mock/pay/${order.id}`, { method: 'POST', body: JSON.stringify({}) })
      if (!payRes.data) return { ok: false, index: i + 1, message: payRes.message || 'payment failed' }
      return { ok: true, index: i + 1 }
    } catch (err: any) {
      return { ok: false, index: i + 1, message: err.message }
    }
  })

  const results = await Promise.all(requests)
  const success = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length

  console.log(`\nResults: ${success} succeeded, ${failed} failed`)
  console.log('\nSuccesses:')
  results.filter((r) => r.ok).forEach((r) => console.log(`  #${r.index} OK`))
  console.log('\nFailures:')
  results.filter((r) => !r.ok).forEach((r) => console.log(`  #${r.index} ${r.message}`))

  const finalData = await api('/activities')
  const finalActivity = finalData?.data?.find((a: any) => a.id === activityId)
  console.log(`\nFinal registeredCount: ${finalActivity.registeredCount}`)
  console.log(`Capacity: ${finalActivity.capacity}`)
  console.log(
    finalActivity.registeredCount <= finalActivity.capacity
      ? 'PASS: No overselling!'
      : 'FAIL: Overselling detected!',
  )
}

main().catch(console.error)
