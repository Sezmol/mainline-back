import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const setStatusSchema = z.object({
  status: z
    .string()
    .trim()
    .min(1, 'Choose a column')
    .max(40, 'A column name is 40 characters or fewer'),
});

export class SetStatusDto extends createZodDto(setStatusSchema) {}

export const assignSchema = z.object({ userId: z.uuid() });

export class AssignDto extends createZodDto(assignSchema) {}
