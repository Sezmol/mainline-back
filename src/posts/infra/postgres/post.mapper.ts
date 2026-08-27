import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { PostEntity } from './post.entity';

export const toPost = (entity: PostEntity) => ({
  id: entity.id,
  type: entity.type,
  direction: entity.direction,
  title: entity.title,
  body: entity.body,
  author: toUser(entity.author),
  likeCount: entity.likeCount ?? 0,
  likedByMe: entity.likedByViewer ?? false,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
