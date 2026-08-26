import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SPECIALITIES } from '../../common/domain/directory';
import { nameSchema, nicknameSchema } from '../../common/validation/fields';

export const updateUserSchema = z.object({
  firstName: nameSchema('first name'),
  lastName: nameSchema('last name'),
  nickname: nicknameSchema,
  speciality: z.enum(SPECIALITIES, { message: 'Pick your speciality' }),
  description: z
    .string()
    .trim()
    .max(500, 'About must be 500 characters or fewer')
    .optional(),
  workplace: z
    .string()
    .trim()
    .max(100, 'Workplace must be 100 characters or fewer')
    .optional(),
});

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
