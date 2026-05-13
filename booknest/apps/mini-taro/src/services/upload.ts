import Taro from '@tarojs/taro'
import { API_BASE_URL } from '@/config/env'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface UploadResult {
  url: string
  key: string
}

export async function chooseCoverImage(): Promise<string> {
  const chooseRes = await Taro.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'],
  })

  const file = chooseRes.tempFiles[0]
  if (!file) throw new Error('未选择图片')
  if (file.size > 3 * 1024 * 1024) {
    await Taro.showToast({ title: '图片不能超过 3MB', icon: 'none' })
    throw new Error('图片不能超过 3MB')
  }

  return file.tempFilePath
}

export async function uploadCover(bookId: string, filePath: string): Promise<UploadResult> {
  const token = useAuthStore.getState().token
  const workspaceId = useWorkspaceStore.getState().activeWorkspaceId

  const res = await Taro.uploadFile({
    url: `${API_BASE_URL}/api/v1/books/${bookId}/cover`,
    filePath,
    name: 'cover',
    header: {
      Authorization: token ? `Bearer ${token}` : '',
      'X-Workspace-Id': workspaceId || '',
    },
  })

  const body = JSON.parse(res.data)
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(body.message || '上传失败')
  }

  return body.data as UploadResult
}
