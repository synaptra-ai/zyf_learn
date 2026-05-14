import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { listWorkspaces } from '@/services/workspaces'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import './index.scss'

export function WorkspaceSwitcher() {
  const token = useAuthStore((s) => s.token)
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspace)

  const [workspaces, setWorkspaces] = useState<any[]>([])

  useEffect(() => {
    if (!token) return
    listWorkspaces().then(setWorkspaces).catch(() => {})
  }, [token])

  const active = workspaces.find((item) => item.id === activeWorkspaceId) || workspaces[0]

  const handleSwitch = async () => {
    if (workspaces.length <= 1) return
    const res = await Taro.showActionSheet({
      itemList: workspaces.map((item) => `${item.name}（${item.members[0]?.role || 'MEMBER'}）`),
    })
    const target = workspaces[res.tapIndex]
    if (target && target.id !== activeWorkspaceId) {
      setActiveWorkspaceId(target.id)
    }
  }

  return (
    <View className="workspace-switcher" onClick={handleSwitch}>
      <Text className="workspace-switcher__name">{active?.name || '选择 Workspace'}</Text>
      {workspaces.length > 1 && <Text className="workspace-switcher__arrow">▼</Text>}
    </View>
  )
}
