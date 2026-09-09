import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  COMPANY_DESCRIPTION_MAX,
  COMPANY_NAME_MAX,
  COMPANY_SOCIAL_LINKS_MAX,
} from '../companies.constants';
import { RESERVED_SLUGS, SLUG_MAX, SLUG_MIN } from '../slug';

export const slugSchema = z
  .string()
  .trim()
  .min(SLUG_MIN, `Address must be at least ${SLUG_MIN} characters`)
  .max(SLUG_MAX, `Address must be ${SLUG_MAX} characters or fewer`)
  .regex(
    /^[a-z0-9-]+$/,
    'Address can contain only lowercase letters, digits and hyphens',
  )
  .toLowerCase();

export const claimableSlugSchema = slugSchema.refine(
  (slug) => !RESERVED_SLUGS.has(slug),
  'That address is reserved',
);

const linkSchema = z
  .url({ protocol: /^https?$/, error: 'Enter a valid link' })
  .max(500, 'A link must be 500 characters or fewer');

export const createCompanySchema = z.object({
  slug: claimableSlugSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(
      COMPANY_NAME_MAX,
      `Name must be ${COMPANY_NAME_MAX} characters or fewer`,
    ),
  logoUrl: linkSchema.nullish().default(null),
  description: z
    .string()
    .trim()
    .max(COMPANY_DESCRIPTION_MAX, 'Description is too long')
    .nullish()
    .default(null),
  website: linkSchema.nullish().default(null),
  location: z
    .string()
    .trim()
    .max(120, 'Location must be 120 characters or fewer')
    .nullish()
    .default(null),
  socialLinks: z
    .array(linkSchema)
    .max(COMPANY_SOCIAL_LINKS_MAX, 'Up to five links')
    .default([]),
});

export class CreateCompanyDto extends createZodDto(createCompanySchema) {}
