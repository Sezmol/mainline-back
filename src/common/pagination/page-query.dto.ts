import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { decodeCursor } from './cursor';

const cursorSchema = z.string().transform((raw, ctx) => {
  const cursor = decodeCursor(raw);

  if (!cursor) {
    ctx.addIssue({
      code: 'custom',
      message: 'That page cursor is not readable',
    });
    return z.NEVER;
  }

  return cursor;
});

export const pageQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export class PageQueryDto extends createZodDto(pageQuerySchema) {}
