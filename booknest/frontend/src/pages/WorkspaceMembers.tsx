import { useState } from 'react'
import { useWorkspaceMembers, useInviteMember } from '@/hooks/useWorkspaces'
import { Shield, ShieldCheck, User, Eye, Mail, Send } from 'lucide-react'

const roleIcons: Record<string, typeof Shield> = {
  OWNER: ShieldCheck,
  ADMIN: Shield,
  MEMBER: User,
  VIEWER: Eye,
}

const roleLabels: Record<string, string> = {
  OWNER: '所有者',
  ADMIN: '管理员',
  MEMBER: '成员',
  VIEWER: '访客',
}

export default function WorkspaceMembers() {
  const { data: members, isLoading } = useWorkspaceMembers()
  const inviteMember = useInviteMember()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    inviteMember.mutate(
      { email: email.trim(), role },
      { onSuccess: () => setEmail('') },
    )
  }

  if (isLoading) return <div className="py-8 text-center text-gray-500">加载中...</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">成员管理</h1>

      <form onSubmit={handleInvite} className="flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">邀请成员</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入邮箱地址"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            required
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="MEMBER">成员</option>
          <option value="ADMIN">管理员</option>
          <option value="VIEWER">访客</option>
        </select>
        <button
          type="submit"
          disabled={inviteMember.isPending}
          className="flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          邀请
        </button>
      </form>

      {inviteMember.isSuccess && (
        <p className="text-sm text-green-600">邀请已发送</p>
      )}
      {inviteMember.isError && (
        <p className="text-sm text-red-600">邀请失败，请检查邮箱地址</p>
      )}

      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            成员列表 ({members?.length || 0})
          </h2>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {members?.map((m: any) => {
            const Icon = roleIcons[m.role] || User
            return (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-600">
                    <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {m.user?.name || m.user?.email}
                    </p>
                    <p className="text-xs text-gray-500">{m.user?.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                  {roleLabels[m.role] || m.role}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
