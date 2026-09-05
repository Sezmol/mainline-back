import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { NotificationEntity } from './notification.entity';

export const toNotification = (entity: NotificationEntity) => ({
  id: entity.id,
  type: entity.type,
  actor: entity.actor ? toUser(entity.actor) : null,
  post: entity.post
    ? {
        id: entity.post.id,
        type: entity.post.type,
        title: entity.post.title,
      }
    : null,
  invite: entity.invite
    ? {
        id: entity.invite.id,
        scope: entity.invite.scope,
        status: entity.invite.status,
        teamId: entity.invite.teamId,
      }
    : null,
  company: entity.company
    ? {
        id: entity.company.id,
        slug: entity.company.slug,
        name: entity.company.name,
      }
    : null,
  subject: entity.subject,
  readAt: entity.readAt,
  createdAt: entity.createdAt,
});
