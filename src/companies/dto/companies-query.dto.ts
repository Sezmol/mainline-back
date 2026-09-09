import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { pageQuerySchema } from '../../common/pagination/page-query.dto';
import { slugSchema } from './create-company.dto';

export const companiesQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
});

export class CompaniesQueryDto extends createZodDto(companiesQuerySchema) {}

export const slugQuerySchema = z.object({ slug: slugSchema });

export class SlugQueryDto extends createZodDto(slugQuerySchema) {}

export const slugAvailabilitySchema = z.object({ available: z.boolean() });

export class SlugAvailabilityDto extends createZodDto(slugAvailabilitySchema) {}
