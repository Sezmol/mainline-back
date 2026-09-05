import { BadRequestException, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { decodeCursor, encodeCursor } from '../common/pagination/cursor';
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
    const decoded = cursor ? decodeCursor(cursor) : null;
    if (cursor && !decoded) throw new BadRequestException('Invalid cursor');

    const found = await this.notifications.findMany({
      userId,
      ...(decoded ? { cursor: decoded } : {}),
      limit: limit + 1,
    });

    const items = found.slice(0, limit);
    const last = items.at(-1);

    return {
      items,
      nextCursor: found.length > limit && last ? encodeCursor(last) : null,
      unreadCount: await this.notifications.countUnread(userId),
    };
  }

  markAllRead(userId: string) {
    return this.notifications.markAllRead(userId);
  }
}
