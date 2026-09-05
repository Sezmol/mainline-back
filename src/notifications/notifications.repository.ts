import type { EntityManager } from 'typeorm';
import type {
  CreateNotificationInput,
  FindNotificationsQuery,
  Notification,
} from './notifications.types';

export abstract class NotificationsRepository {
  abstract create(
    input: CreateNotificationInput,
    manager: EntityManager,
  ): Promise<Notification>;
  abstract findMany(query: FindNotificationsQuery): Promise<Notification[]>;
  abstract countUnread(userId: string): Promise<number>;
  abstract markAllRead(userId: string): Promise<void>;
}
