import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { SPECIALITIES } from '../../common/domain/directory';
import {
  emailSchema,
  nameSchema,
  nicknameSchema,
  passwordSchema,
} from '../../common/validation/fields';

export const registerSchema = z
  .object({
    firstName: nameSchema('first name'),
    lastName: nameSchema('last name'),
    nickname: nicknameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repeat your password'),
    speciality: z.enum(SPECIALITIES, { message: 'Pick your speciality' }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export class RegisterDto extends createZodDto(registerSchema) {}
