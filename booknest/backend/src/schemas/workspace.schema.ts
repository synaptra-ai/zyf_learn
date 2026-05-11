import { z } from 'zod'

export const workspaceRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])

export const createWorkspaceBodySchema = z.object({
  name: z.string().min(1, 'Workspace 名称不能为空').max(100),
  description: z.string().max(1000).optional(),
})

export const inviteMemberBodySchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  role: workspaceRoleSchema.default('MEMBER'),
})

export const updateMemberRoleBodySchema = z.object({
  role: workspaceRoleSchema,
})
