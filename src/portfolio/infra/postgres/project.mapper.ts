import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { ProjectEntity } from './project.entity';

export const toProject = (entity: ProjectEntity) => ({
  id: entity.id,
  title: entity.title,
  ...(entity.description ? { description: entity.description } : {}),
  links: entity.links,
  ...(entity.previewUrl ? { previewUrl: entity.previewUrl } : {}),
  author: toUser(entity.user),
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
