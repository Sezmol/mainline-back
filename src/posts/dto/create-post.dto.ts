import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SPECIALITIES } from '../../common/domain/directory';

export const createPostSchema = z.object({
  direction: z.enum(SPECIALITIES),
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title')
    .max(100, 'Title must be 100 characters or fewer'),
  body: z
    .string()
    .trim()
    .min(1, 'Write something')
    .max(20000, 'A post must be 20000 characters or fewer'),
});

export class CreatePostDto extends createZodDto(createPostSchema) {}
