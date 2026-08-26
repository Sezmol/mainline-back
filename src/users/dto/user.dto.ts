import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ROLES, SPECIALITIES } from '../../common/domain/directory';
import type { User } from '../users.types';

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

export const profileSchema = publicUserSchema.extend({
  createdAt: z.iso.datetime(),
});

export class ProfileDto extends createZodDto(profileSchema) {}

export const toPublicUser = (user: User): PublicUserDto => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  nickname: user.nickname,
  speciality: user.speciality,
  role: user.role,
  ...(user.description ? { description: user.description } : {}),
  ...(user.workplace ? { workplace: user.workplace } : {}),
});

export const toSessionUser = (user: User): SessionUserDto => ({
  ...toPublicUser(user),
  email: user.email,
});

export const toProfile = (user: User): ProfileDto => ({
  ...toPublicUser(user),
  createdAt: user.createdAt.toISOString(),
});
