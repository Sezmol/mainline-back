import type { z } from 'zod';
import { namedZodDto } from '../../common/validation/zod-dto';
import { createPostSchema } from './create-post.dto';

export const UpdatePostDto = namedZodDto('UpdatePostDto', createPostSchema);
export type UpdatePostDto = z.infer<typeof createPostSchema>;
