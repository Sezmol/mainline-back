import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  INVITE_SCOPES,
  INVITE_STATUSES,
  NOTIFICATION_TYPES,
  POST_TYPES,
} from '../../common/domain/directory';
import { publicUserSchema } from '../../users/dto/user.dto';

export const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  actor: publicUserSchema.nullable(),
  post: z
    .object({
      id: z.string(),
      type: z.enum(POST_TYPES),
      title: z.string(),
    })
    .nullable(),
  invite: z
    .object({
      id: z.string(),
      scope: z.enum(INVITE_SCOPES),
      status: z.enum(INVITE_STATUSES),
      teamId: z.string().nullable(),
    })
    .nullable(),
  company: z
    .object({ id: z.string(), slug: z.string(), name: z.string() })
    .nullable(),
  subject: z.string().nullable(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export class NotificationDto extends createZodDto(notificationSchema) {}

export const notificationPageSchema = z.object({
  items: z.array(notificationSchema),
  nextCursor: z.string().nullable(),
  unreadCount: z.number().int(),
});

export class NotificationPageDto extends createZodDto(notificationPageSchema) {}
