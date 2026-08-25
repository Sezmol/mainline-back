import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ROLES, SPECIALITIES } from '../../common/domain/directory';

export const publicUserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  nickname: z.string(),
  speciality: z.enum(SPECIALITIES),
  role: z.enum(ROLES),
  description: z.string().optional(),
  workplace: z.string().optional(),
});

export class PublicUserDto extends createZodDto(publicUserSchema) {}

export const sessionUserSchema = publicUserSchema.extend({
  email: z.email(),
});

export class SessionUserDto extends createZodDto(sessionUserSchema) {}
