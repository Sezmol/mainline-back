import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const MESSAGE_LIMIT = 4000;

export const createMessageSchema = z
  .object({
    id: z.uuid().optional(),
    body: z
      .string()
      .trim()
      .max(
        MESSAGE_LIMIT,
        `A message must be ${MESSAGE_LIMIT} characters or fewer`,
      )
      .default(''),
    postId: z.uuid().optional(),
  })
  .refine((value) => value.body.length > 0 || value.postId !== undefined, {
    message: 'Write something or attach a post',
    path: ['body'],
  });

export class CreateMessageDto extends createZodDto(createMessageSchema) {}
