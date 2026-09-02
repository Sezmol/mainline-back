import { Controller, Get, HttpCode, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PageQueryDto } from '../common/pagination/page-query.dto';
import { toPublicUser } from '../users/dto/user.dto';
import type { User } from '../users/users.types';
import { NotificationDto, NotificationPageDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';
import type { Notification } from './notifications.types';

const toNotificationDto = (notification: Notification): NotificationDto => ({
  id: notification.id,
  type: notification.type,
  actor: notification.actor ? toPublicUser(notification.actor) : null,
  post: notification.post,
  invite: notification.invite,
  company: notification.company,
  subject: notification.subject,
  readAt: notification.readAt ? notification.readAt.toISOString() : null,
  createdAt: notification.createdAt.toISOString(),
});

@ApiTags('notifications')
@ApiCookieAuth('access_token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Your notifications, newest first',
    description:
      'Never mixed into the feed: a notification is not a post. Paged on the ' +
      'same cursor as everything else.',
  })
  @ZodResponse({ status: 200, type: NotificationPageDto })
  async list(@Query() query: PageQueryDto, @CurrentUser() user: User) {
    const page = await this.notifications.findPage(query, user.id);

    return {
      items: page.items.map(toNotificationDto),
      nextCursor: page.nextCursor,
      unreadCount: page.unreadCount,
    };
  }

  @Put('read')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Mark everything read',
    description:
      'What opening the bell does. Reading one at a time is not a ' +
      'thing the interface offers.',
  })
  markAllRead(@CurrentUser() user: User) {
    return this.notifications.markAllRead(user.id);
  }
}
