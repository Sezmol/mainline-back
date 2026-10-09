import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { MessageEntity } from './message.entity';

export const toMessage = (entity: MessageEntity) => ({
  id: entity.id,
  chatId: entity.chatId,
  author: toUser(entity.author),
  body: entity.body,
  postId: entity.postId,
  createdAt: entity.createdAt,
  editedAt: entity.editedAt,
});
