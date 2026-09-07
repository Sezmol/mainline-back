import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { COMPANY_ROLES } from '../../common/domain/directory';

export const setRoleSchema = z.object({
  role: z.enum(COMPANY_ROLES).exclude(['owner']),
});

export class SetRoleDto extends createZodDto(setRoleSchema) {}

export const transferSchema = z.object({ userId: z.uuid() });

export class TransferDto extends createZodDto(transferSchema) {}
