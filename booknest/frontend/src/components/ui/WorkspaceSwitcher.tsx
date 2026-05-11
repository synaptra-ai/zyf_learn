import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, Check } from 'lucide-react'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useWorkspaceStore } from '@/stores/useWorkspaceStore'

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: workspaces } = useWorkspaces()
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore()

  const activeWorkspace = workspaces?.find((w: any) => w.id === activeWorkspaceId)

  useEffect(() => {
    if (workspaces?.length && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id)
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!workspaces?.length) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        <Building2 className="h-4 w-4" />
        <span className="max-w-[140px] truncate">{activeWorkspace?.name || '选择工作区'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700">
          {workspaces.map((ws: any) => (
            <button
              key={ws.id}
              onClick={() => { setActiveWorkspaceId(ws.id); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="truncate">{ws.name}</span>
              {ws.id === activeWorkspaceId && <Check className="ml-auto h-4 w-4 text-primary-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
