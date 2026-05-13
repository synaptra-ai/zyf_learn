import Taro from '@tarojs/taro'

const API_MAP: Record<string, string> = {
  develop: process.env.TARO_APP_API_URL || 'http://localhost:4000',
  trial: 'https://zyfcloud.cn',
  release: 'https://zyfcloud.cn',
}

export function getEnvVersion() {
  try {
    const accountInfo = Taro.getAccountInfoSync()
    return accountInfo?.miniProgram?.envVersion || 'develop'
  } catch {
    return 'develop'
  }
}

export const ENV_VERSION = getEnvVersion()
export const API_BASE_URL = API_MAP[ENV_VERSION] || API_MAP.develop
