import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { ChatsService } from '../chats/chats.service';
import type { InteractionStatus } from '../common/domain/directory';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { PostsRepository } from '../posts/posts.repository';
import { PostsService } from '../posts/posts.service';
import type { Post } from '../posts/posts.types';
import { DEFAULT_STATUS } from '../common/domain/directory';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import type { User } from '../users/users.types';
import type { InteractDto } from './dto/interact.dto';
import { InteractionsRepository } from './interactions.repository';
import {
  InteractionExistsError,
  type CreateInteractionInput,
} from './interactions.types';

type Decision = Extract<InteractionStatus, 'accepted' | 'declined'>;

@Injectable()
export class InteractionsService {
  constructor(
    private readonly interactions: InteractionsRepository,
    private readonly posts: PostsService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly chats: ChatsService,
    private readonly postsRepository: PostsRepository,
    private readonly projects: ProjectsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async list(postId: string, viewerId: string) {
    const post = await this.posts.findById(postId, viewerId);

    if (post.author.id !== viewerId) {
      throw new ForbiddenException('Only the author sees who responded');
    }

    return this.interactions.findByPost(postId);
  }

  async interact(postId: string, actor: User, dto: InteractDto) {
    const post = await this.posts.findById(postId, actor.id);

    switch (dto.action) {
      case 'respond':
        return this.respond(post, actor);
      case 'invite':
        return this.invite(post, actor, dto.userId);
      case 'accept':
        return this.decide(post, actor, 'accepted', dto.userId);
      case 'decline':
        return this.decide(post, actor, 'declined', dto.userId);
    }
  }

  private respond(post: Post, actor: User) {
    if (post.type === 'content') {
      throw AppException.validation('This post takes no responses');
    }

    if (post.author.id === actor.id) {
      throw AppException.validation('You cannot respond to your own post');
    }

    if (post.type === 'event' && post.isPrivate) {
      throw new ForbiddenException('This event runs on invitations');
    }

    if (post.type === 'task') {
      if (post.isPrivate) {
        throw new ForbiddenException('This task is not looking for anybody');
      }

      if (post.assignees.length > 0) {
        throw AppException.conflict('This task already has somebody on it');
      }
    }

    const status = post.type === 'event' ? 'accepted' : 'pending';

    return this.dataSource.transaction(async (manager) => {
      if (status === 'accepted') await this.requireSeat(post, manager);

      const interaction = await this.create(
        { postId: post.id, userId: actor.id, kind: 'response', status },
        manager,
      );

      if (post.type === 'vacancy') {
        await this.chats.ensureVacancyChat(
          post.id,
          post.author.id,
          actor.id,
          manager,
        );
      } else if (post.type === 'task') {
        await this.chats.ensureTaskChat(
          post.id,
          post.author.id,
          actor.id,
          manager,
        );
      } else {
        await this.joinEventChat(post, actor.id, manager);
      }

      await this.notifications.create(
        {
          userId: post.author.id,
          actorId: actor.id,
          postId: post.id,
          type: 'response_received',
        },
        manager,
      );

      return interaction;
    });
  }

  private async invite(post: Post, actor: User, userId: string) {
    if (post.type !== 'event') {
      throw AppException.validation('Only an event takes invitations');
    }

    if (post.author.id !== actor.id) {
      throw new ForbiddenException(
        'Only the author invites people to an event',
      );
    }

    if (userId === actor.id) {
      throw AppException.validation('You are already in your own event');
    }

    if (!(await this.users.findById(userId))) {
      throw new NotFoundException('User not found');
    }

    return this.dataSource.transaction(async (manager) => {
      const interaction = await this.create(
        { postId: post.id, userId, kind: 'invite', status: 'pending' },
        manager,
      );

      await this.notifications.create(
        {
          userId,
          actorId: actor.id,
          postId: post.id,
          type: 'invite_received',
        },
        manager,
      );

      return interaction;
    });
  }

  private async decide(
    post: Post,
    actor: User,
    status: Decision,
    userId?: string,
  ) {
    const existing = await this.interactions.findByPostAndUser(
      post.id,
      userId ?? actor.id,
    );

    if (!existing) throw new NotFoundException('There is nothing to answer');

    const decider =
      existing.kind === 'response' ? post.author.id : existing.user.id;

    if (decider !== actor.id) {
      throw new ForbiddenException('This one is not yours to answer');
    }

    if (existing.status !== 'pending') {
      throw AppException.conflict('This one has already been answered');
    }

    return this.dataSource.transaction(async (manager) => {
      if (status === 'accepted') {
        await this.requireSeat(post, manager);
        if (post.type === 'event') {
          await this.joinEventChat(post, existing.user.id, manager);
        }
        if (post.type === 'task') {
          await this.takeOnTask(post, existing.user, manager);
        }
      }

      const interaction = await this.interactions.setStatus(
        existing.id,
        status,
        manager,
      );

      await this.notifications.create(
        {
          userId:
            existing.kind === 'response' ? existing.user.id : post.author.id,
          actorId: actor.id,
          postId: post.id,
          type: `${existing.kind}_${status}`,
        },
        manager,
      );

      return interaction;
    });
  }

  private async takeOnTask(post: Post, assignee: User, manager: EntityManager) {
    if (post.type !== 'task') return;

    if (post.projectId) {
      const project = await this.projects.require(post.projectId, manager);
      await this.projects.joinProject(project, assignee.id, manager);
    } else {
      const project = await this.projects.adoptTask(
        post.author,
        assignee,
        post.title,
        manager,
      );

      await this.postsRepository.attachToProject(
        post.id,
        project.id,
        DEFAULT_STATUS,
        manager,
      );
    }

    await this.postsRepository.addAssignee(post.id, assignee.id, manager);
    await this.postsRepository.setPrivate(post.id, true, manager);
  }

  private async joinEventChat(
    post: Post,
    userId: string,
    manager: EntityManager,
  ) {
    const chat = await this.chats.ensureEventChat(
      post.id,
      post.author.id,
      manager,
    );

    await this.chats.join(chat, userId, manager);
  }

  private async requireSeat(post: Post, manager: EntityManager) {
    if (post.type !== 'event' || post.participantLimit === null) return;

    const taken = await this.interactions.countAcceptedForUpdate(
      post.id,
      manager,
    );

    if (taken + 1 >= post.participantLimit) {
      throw AppException.conflict('This event is full');
    }
  }

  private async create(input: CreateInteractionInput, manager: EntityManager) {
    try {
      return await this.interactions.create(input, manager);
    } catch (error) {
      if (error instanceof InteractionExistsError) {
        throw AppException.conflict(
          input.kind === 'invite'
            ? 'This person is already on the list'
            : 'You have already responded to this post',
        );
      }
      throw error;
    }
  }
}
