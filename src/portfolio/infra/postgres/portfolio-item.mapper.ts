import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { PortfolioItemEntity } from './portfolio-item.entity';

export const toPortfolioItem = (entity: PortfolioItemEntity) => ({
  id: entity.id,
  title: entity.title,
  ...(entity.description ? { description: entity.description } : {}),
  links: entity.links,
  ...(entity.previewUrl ? { previewUrl: entity.previewUrl } : {}),
  author: toUser(entity.user),
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
