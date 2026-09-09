import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { publicUserSchema } from '../../users/dto/user.dto';

export const portfolioItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  links: z.array(z.string()),
  previewUrl: z.string().optional(),
  author: publicUserSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class PortfolioItemDto extends createZodDto(portfolioItemSchema) {}
