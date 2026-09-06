import { createZodDto } from 'nestjs-zod';
import { createPortfolioItemSchema } from './create-portfolio-item.dto';

export class UpdatePortfolioItemDto extends createZodDto(
  createPortfolioItemSchema,
) {}
