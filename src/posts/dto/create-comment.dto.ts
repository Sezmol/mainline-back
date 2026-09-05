import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { MESSAGE_LIMIT } from '../../chats/dto/create-message.dto';

export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write something first')
    .max(
      MESSAGE_LIMIT,
      `A comment must be ${MESSAGE_LIMIT} characters or fewer`,
    ),
});

export class CreateCommentDto extends createZodDto(createCommentSchema) {}
