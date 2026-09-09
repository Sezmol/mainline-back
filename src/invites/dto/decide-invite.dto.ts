import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const decideInviteSchema = z.object({
  decision: z.enum(['accepted', 'declined']),
});

export class DecideInviteDto extends createZodDto(decideInviteSchema) {}
