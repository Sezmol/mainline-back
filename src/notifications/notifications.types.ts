import type { Cursor } from '../common/pagination/cursor';
import type {
  InviteScope,
  InviteStatus,
  NotificationType,
  PostType,
} from '../common/domain/directory';
import type { User } from '../users/users.types';

export interface NotificationSource {
  id: string;
  type: PostType;
  title: string;
}

export interface NotificationInvite {
  id: string;
  scope: InviteScope;
  status: InviteStatus;
  teamId: string | null;
}

export interface NotificationCompany {
  id: string;
  slug: string;
  name: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  actor: User | null;
  post: NotificationSource | null;
  invite: NotificationInvite | null;
  company: NotificationCompany | null;
  subject: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  actorId?: string;
  postId?: string;
  inviteId?: string;
  companyId?: string;
  subject?: string;
}

export interface FindNotificationsQuery {
  userId: string;
  cursor?: Cursor;
  limit: number;
}
