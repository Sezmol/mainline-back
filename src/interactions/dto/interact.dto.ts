import { z } from 'zod';
import { namedZodDto } from '../../common/validation/zod-dto';

const target = z.uuid('Point at a person by id').optional();

export const interactSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('respond') }),
  z.strictObject({
    action: z.literal('invite'),
    userId: z.uuid('Pick a person to invite'),
  }),
  z.strictObject({ action: z.literal('accept'), userId: target }),
  z.strictObject({ action: z.literal('decline'), userId: target }),
]);

export const InteractDto = namedZodDto('InteractDto', interactSchema);
export type InteractDto = z.infer<typeof interactSchema>;
