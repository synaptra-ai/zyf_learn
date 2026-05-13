import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useQuery } from '@tanstack/react-query'
import { listWorkspaces } from '@/services/workspaces'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import './index.scss'

export function WorkspaceSwitcher() {
  const token = useAuthStore((s) => s.token)
  const { data = [] } = useQuery({ queryKey: ['workspaces'], queryFn: listWorkspaces, enabled: Boolean(token) })
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspace)

  const active = data.find((item) => item.id === activeWorkspaceId) || data[0]

  const handleSwitch = async () => {
    if (data.length <= 1) return
    const res = await Taro.showActionSheet({
      itemList: data.map((item) => `${item.name}（${item.members[0]?.role || 'MEMBER'}）`),
    })
    const target = data[res.tapIndex]
    if (target && target.id !== activeWorkspaceId) {
      setActiveWorkspaceId(target.id)
    }
  }

  return (
    <View className="workspace-switcher" onClick={handleSwitch}>
      <Text className="workspace-switcher__name">{active?.name || '选择 Workspace'}</Text>
      {data.length > 1 && <Text className="workspace-switcher__arrow">▼</Text>}
    </View>
  )
}
