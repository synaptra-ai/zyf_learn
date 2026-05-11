import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { resolveWorkspace, requireWorkspaceRole } from '../middleware/workspace'
import { validateBody } from '../middleware/zodValidate'
import {
  createWorkspaceBodySchema,
  inviteMemberBodySchema,
  updateMemberRoleBodySchema,
} from '../schemas/workspace.schema'
import { workspaceController } from '../controllers/workspace.controller'

const router = Router()

router.use(authenticate)

router.get('/', workspaceController.list)
router.post('/', validateBody(createWorkspaceBodySchema), workspaceController.create)

router.post('/invitations/:token/accept', workspaceController.acceptInvitation)

router.get(
  '/current/members',
  resolveWorkspace,
  requireWorkspaceRole('ADMIN'),
  workspaceController.members,
)

router.post(
  '/current/invitations',
  resolveWorkspace,
  requireWorkspaceRole('ADMIN'),
  validateBody(inviteMemberBodySchema),
  workspaceController.invite,
)

router.put(
  '/current/members/:memberId/role',
  resolveWorkspace,
  requireWorkspaceRole('OWNER'),
  validateBody(updateMemberRoleBodySchema),
  workspaceController.updateMemberRole,
)

export default router
