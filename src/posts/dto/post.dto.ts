import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { POST_TYPES, SPECIALITIES } from '../../common/domain/directory';
import { publicUserSchema } from '../../users/dto/user.dto';

export const postSchema = z.object({
  id: z.string(),
  type: z.enum(POST_TYPES),
  direction: z.enum(SPECIALITIES),
  title: z.string(),
  body: z.string(),
  author: publicUserSchema,
  likeCount: z.number().int(),
  likedByMe: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class PostDto extends createZodDto(postSchema) {}

export const postPageSchema = z.object({
  items: z.array(postSchema),
  nextCursor: z.string().nullable(),
});

export class PostPageDto extends createZodDto(postPageSchema) {}
