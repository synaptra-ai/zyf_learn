import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { API_BASE_URL } from '@/config/env'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions<TBody = unknown> {
  url: string
  method?: HttpMethod
  data?: TBody
  auth?: boolean
  showErrorToast?: boolean
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export async function request<T, TBody = unknown>(options: RequestOptions<TBody>): Promise<T> {
  const token = useAuthStore.getState().token
  const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (activeWorkspaceId) {
    headers['X-Workspace-Id'] = activeWorkspaceId
  }

  const fullUrl =
    options.method === 'GET' && options.data
      ? buildUrlWithQuery(`${API_BASE_URL}${options.url}`, options.data as Record<string, unknown>)
      : `${API_BASE_URL}${options.url}`

  try {
    const res = await Taro.request<ApiResponse<T>>({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.method !== 'GET' ? options.data : undefined,
      header: headers,
    })

    if (res.statusCode === 401) {
      if (options.auth === false) {
        throw new Error(res.data?.message || '邮箱或密码错误')
      }
      useAuthStore.getState().logout()
      Taro.navigateTo({ url: `/pages/login/index?redirect=${encodeURIComponent(getCurrentPath())}` })
      throw new Error('登录已失效，请重新登录')
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(res.data?.message || `请求失败：${res.statusCode}`)
    }

    return res.data.data
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络请求失败'
    if (options.showErrorToast !== false) {
      Taro.showToast({ title: message, icon: 'none' }).catch(() => {})
    }
    throw error
  }
}

function buildUrlWithQuery(baseUrl: string, params: Record<string, unknown>) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return qs ? `${baseUrl}?${qs}` : baseUrl
}

function getCurrentPath() {
  const pages = Taro.getCurrentPages()
  const current = pages[pages.length - 1]
  if (!current) return '/pages/index/index'
  return `/${current.route}`
}
