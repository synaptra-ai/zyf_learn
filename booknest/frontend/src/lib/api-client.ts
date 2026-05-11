import axios from 'axios'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器: 注入 JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const workspaceId = useWorkspaceStore.getState().activeWorkspaceId
  if (workspaceId) {
    config.headers['X-Workspace-Id'] = workspaceId
  }

  return config
})

// 响应拦截器: 解包 {code, message, data} → data
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return { ...response, data: response.data.data }
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
