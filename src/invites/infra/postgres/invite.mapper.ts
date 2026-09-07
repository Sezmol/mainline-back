import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { Invite } from '../../invites.types';
import type { InviteEntity } from './invite.entity';

export const toInvite = (entity: InviteEntity): Invite => ({
  id: entity.id,
  scope: entity.scope,
  status: entity.status,
  role: entity.role,
  companyId: entity.companyId,
  departmentId: entity.departmentId,
  teamId: entity.teamId,
  inviter: toUser(entity.inviter),
  invitee: toUser(entity.invitee),
  target: {
    id: entity.departmentId ?? entity.teamId ?? entity.companyId ?? '',
    name:
      entity.department?.name ??
      entity.team?.name ??
      entity.company?.name ??
      'Unknown',
    companySlug: entity.company?.slug ?? null,
  },
  createdAt: entity.createdAt,
  decidedAt: entity.decidedAt,
});
