export async function platformLogin() {
  console.log('[h5] mock login')
  return 'mock-code'
}

export async function platformRequestPayment(_params: any) {
  console.log('[h5] mock payment')
}

export async function platformSubscribeMessage(_tmplIds: string[]) {
  console.log('[h5] subscribe message not supported')
  return {}
}

export function platformOpenCustomerService() {
  console.log('[h5] customer service not supported')
}
