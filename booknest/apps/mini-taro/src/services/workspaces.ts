import { request } from './request'

export interface WorkspaceItem {
  id: string
  name: string
  description?: string | null
  members: { role: string }[]
  _count: { members: number; books: number }
}

export function listWorkspaces() {
  return request<WorkspaceItem[]>({ url: '/api/v1/workspaces' })
}
