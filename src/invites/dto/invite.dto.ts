import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  COMPANY_ROLES,
  INVITE_SCOPES,
  INVITE_STATUSES,
} from '../../common/domain/directory';
import { publicUserSchema, toPublicUser } from '../../users/dto/user.dto';
import type { Invite } from '../invites.types';

export const inviteSchema = z.object({
  id: z.string(),
  scope: z.enum(INVITE_SCOPES),
  status: z.enum(INVITE_STATUSES),
  role: z.enum(COMPANY_ROLES).nullable(),
  inviter: publicUserSchema,
  invitee: publicUserSchema,
  target: z.object({
    id: z.string(),
    name: z.string(),
    companySlug: z.string().nullable(),
  }),
  createdAt: z.iso.datetime(),
  decidedAt: z.iso.datetime().nullable(),
});

export class InviteDto extends createZodDto(inviteSchema) {}

export const toInviteDto = (invite: Invite): InviteDto => ({
  id: invite.id,
  scope: invite.scope,
  status: invite.status,
  role: invite.role,
  inviter: toPublicUser(invite.inviter),
  invitee: toPublicUser(invite.invitee),
  target: invite.target,
  createdAt: invite.createdAt.toISOString(),
  decidedAt: invite.decidedAt?.toISOString() ?? null,
});
