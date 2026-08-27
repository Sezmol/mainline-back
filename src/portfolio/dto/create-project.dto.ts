import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const linkSchema = z
  .url({ protocol: /^https?$/, error: 'Enter a valid link' })
  .max(500, 'A link must be 500 characters or fewer');

export const createProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title')
    .max(100, 'Title must be 100 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional(),
  links: z.array(linkSchema).max(3, 'Up to three links').default([]),
  previewUrl: linkSchema.optional(),
});

export class CreateProjectDto extends createZodDto(createProjectSchema) {}
