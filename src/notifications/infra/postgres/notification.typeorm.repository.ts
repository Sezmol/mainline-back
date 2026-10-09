import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, type EntityManager } from 'typeorm';
import { NotificationsRepository } from '../../notifications.repository';
import type {
  CreateNotificationInput,
  FindNotificationsQuery,
} from '../../notifications.types';
import { NotificationEntity } from './notification.entity';
import { toNotification } from './notification.mapper';

@Injectable()
export class NotificationTypeormRepository extends NotificationsRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
  ) {
    super();
  }

  async create(input: CreateNotificationInput, manager: EntityManager) {
    const repository = manager.getRepository(NotificationEntity);
    const { id } = await repository.save(repository.create(input));

    const saved = await repository.findOne({
      where: { id },
      relations: { actor: true, post: true, invite: true, company: true },
    });

    if (!saved) {
      throw new Error(`Notification ${id} vanished right after a write`);
    }

    return toNotification(saved);
  }

  async findMany({ userId, cursor, limit }: FindNotificationsQuery) {
    const query = this.notifications
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.actor', 'actor')
      .leftJoinAndSelect('notification.post', 'post')
      .leftJoinAndSelect('notification.invite', 'invite')
      .leftJoinAndSelect('notification.company', 'company')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.id', 'DESC')
      .limit(limit);

    if (cursor) {
      query.andWhere(
        '(notification.createdAt, notification.id) < (:createdAt, :id)',
        cursor,
      );
    }

    const found = await query.getMany();
    return found.map(toNotification);
  }

  countUnread(userId: string) {
    return this.notifications.countBy({ userId, readAt: IsNull() });
  }

  async markAllRead(userId: string) {
    await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }
}
