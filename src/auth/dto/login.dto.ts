import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginSchema = z.object({
  nickname: z.string().trim().toLowerCase().min(1, 'Enter your nickname'),
  password: z.string().min(1, 'Enter your password'),
});

export class LoginDto extends createZodDto(loginSchema) {}
