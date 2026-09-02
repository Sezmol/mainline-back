import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { InteractionEntity } from './interaction.entity';

export const toInteraction = (entity: InteractionEntity) => ({
  id: entity.id,
  postId: entity.postId,
  kind: entity.kind,
  status: entity.status,
  user: toUser(entity.user),
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
