import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { emailSchema, nicknameSchema } from '../../common/validation/fields';

export const availabilityQuerySchema = z.object({
  nickname: nicknameSchema.optional(),
  email: emailSchema.optional(),
});

export class AvailabilityQueryDto extends createZodDto(
  availabilityQuerySchema,
) {}

export const availabilityResponseSchema = z.object({
  nickname: z.boolean().optional(),
  email: z.boolean().optional(),
});

export class AvailabilityResponseDto extends createZodDto(
  availabilityResponseSchema,
) {}
