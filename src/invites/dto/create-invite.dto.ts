import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { COMPANY_ROLES, INVITE_STATUSES } from '../../common/domain/directory';
import { nicknameSchema } from '../../common/validation/fields';

export const createInviteSchema = z.object({
  nickname: nicknameSchema,
  role: z.enum(COMPANY_ROLES).exclude(['owner']).default('employee'),
});

export class CreateInviteDto extends createZodDto(createInviteSchema) {}

export const invitesQuerySchema = z.object({
  status: z.enum(INVITE_STATUSES).optional().default('pending'),
});

export class InvitesQueryDto extends createZodDto(invitesQuerySchema) {}
