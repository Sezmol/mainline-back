import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CHAT_TYPES } from '../../common/domain/directory';

export const chatListQuerySchema = z.object({
  archived: z.stringbool().default(false),
  type: z.enum(CHAT_TYPES).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export class ChatListQueryDto extends createZodDto(chatListQuerySchema) {}

export const readChatSchema = z.object({ messageId: z.uuid() });

export class ReadChatDto extends createZodDto(readChatSchema) {}
