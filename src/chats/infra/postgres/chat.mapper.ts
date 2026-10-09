import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { ChatParticipantEntity } from './chat-participant.entity';
import type { ChatEntity } from './chat.entity';

export const toChat = (entity: ChatEntity) => ({
  id: entity.id,
  type: entity.type,
  post: entity.post
    ? {
        id: entity.post.id,
        type: entity.post.type,
        title: entity.post.title,
      }
    : null,
  owner: entity.owner ? toUser(entity.owner) : null,
  title: entity.title,
  writeRestricted: entity.writeRestricted,
  lastMessageAt: entity.lastMessageAt,
  createdAt: entity.createdAt,
});

export const toMembership = (entity: ChatParticipantEntity) => ({
  chatId: entity.chatId,
  userId: entity.userId,
  canWrite: entity.canWrite,
  lastReadAt: entity.lastReadAt,
  archivedAt: entity.archivedAt,
  removedAt: entity.removedAt,
});

export const toParticipant = (entity: ChatParticipantEntity) => ({
  user: toUser(entity.user),
  canWrite: entity.canWrite,
  joinedAt: entity.joinedAt,
});
