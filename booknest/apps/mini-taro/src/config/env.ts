declare const process: { env: { TARO_APP_API_URL: string } }
export const API_BASE_URL = process.env.TARO_APP_API_URL || 'http://localhost:4000'
