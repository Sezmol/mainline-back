import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { toPage } from '../common/pagination/cursor';
import type { PageQueryDto } from '../common/pagination/page-query.dto';
import { NotificationsRepository } from './notifications.repository';
import type { CreateNotificationInput } from './notifications.types';

@Injectable()
export class NotificationsService {
  constructor(private readonly notifications: NotificationsRepository) {}

  create(input: CreateNotificationInput, manager: EntityManager) {
    if (input.actorId === input.userId) return null;

    return this.notifications.create(input, manager);
  }

  async findPage({ cursor, limit }: PageQueryDto, userId: string) {
    const found = await this.notifications.findMany({
      userId,
      ...(cursor ? { cursor } : {}),
      limit: limit + 1,
    });

    return {
      ...toPage(found, limit, (notification) => notification),
      unreadCount: await this.notifications.countUnread(userId),
    };
  }

  markAllRead(userId: string) {
    return this.notifications.markAllRead(userId);
  }
}
