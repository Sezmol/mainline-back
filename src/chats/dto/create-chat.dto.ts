import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createChatSchema = z.object({
  type: z.literal('private'),
  userId: z.uuid('Pick a person to write to'),
});

export class CreateChatDto extends createZodDto(createChatSchema) {}
