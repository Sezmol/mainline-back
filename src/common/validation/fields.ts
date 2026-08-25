import { z } from 'zod';

export const nameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}`)
    .max(50, `Your ${label} must be 50 characters or fewer`);

export const nicknameSchema = z
  .string()
  .trim()
  .min(3, 'Nickname must be at least 3 characters')
  .max(32, 'Nickname must be 32 characters or fewer')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Nickname can contain only letters, digits, underscores and hyphens',
  )
  .toLowerCase();

export const emailSchema = z
  .email('Enter a valid email address')
  .max(254, 'Email must be 254 characters or fewer')
  .trim()
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or fewer')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one digit');
