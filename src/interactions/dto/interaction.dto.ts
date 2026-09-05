import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  INTERACTION_KINDS,
  INTERACTION_STATUSES,
} from '../../common/domain/directory';
import { publicUserSchema } from '../../users/dto/user.dto';

export const interactionSchema = z.object({
  id: z.string(),
  postId: z.string(),
  kind: z.enum(INTERACTION_KINDS),
  status: z.enum(INTERACTION_STATUSES),
  user: publicUserSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class InteractionDto extends createZodDto(interactionSchema) {}
