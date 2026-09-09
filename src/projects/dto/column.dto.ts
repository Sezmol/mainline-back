import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { COLUMN_KINDS } from '../../common/domain/directory';

export const createColumnSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(40, 'The name must be 40 characters or fewer'),
  kind: z.enum(COLUMN_KINDS).default('doing'),
});

export class CreateColumnDto extends createZodDto(createColumnSchema) {}

export class UpdateColumnDto extends createZodDto(createColumnSchema) {}

export const reorderColumnsSchema = z.object({
  columnIds: z.array(z.uuid()).min(1, 'Send the whole order'),
});

export class ReorderColumnsDto extends createZodDto(reorderColumnsSchema) {}
