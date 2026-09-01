import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { POST_TYPES, SPECIALITIES } from '../../common/domain/directory';
import { pageQuerySchema } from '../../common/pagination/page-query.dto';
import { TASK_SCOPES } from '../posts.types';

export const postsQuerySchema = pageQuerySchema.extend({
  type: z.enum(POST_TYPES).optional(),
  direction: z.enum(SPECIALITIES).optional(),
  companyId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  scope: z.enum(TASK_SCOPES).optional(),
});

export class PostsQueryDto extends createZodDto(postsQuerySchema) {}
