import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CHAT_TYPES } from '../../common/domain/directory';
import { pageQuerySchema } from '../../common/pagination/page-query.dto';

export const chatListQuerySchema = pageQuerySchema.extend({
  archived: z.stringbool().default(false),
  type: z.enum(CHAT_TYPES).optional(),
});

export class ChatListQueryDto extends createZodDto(chatListQuerySchema) {}

export const readChatSchema = z.object({ messageId: z.uuid() });

export class ReadChatDto extends createZodDto(readChatSchema) {}
