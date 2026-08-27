import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { POST_TYPES, SPECIALITIES } from '../../common/domain/directory';

export const postsQuerySchema = z.object({
  type: z.enum(POST_TYPES).optional(),
  direction: z.enum(SPECIALITIES).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export class PostsQueryDto extends createZodDto(postsQuerySchema) {}
