import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChatEventsPublisher } from '../chats/chat-events.publisher';
import { ChatsService } from '../chats/chats.service';
import { CompanyMemberEntity } from '../companies/infra/postgres/company-member.entity';
import { TeamMemberEntity } from '../companies/infra/postgres/team-member.entity';
import { DEFAULT_COLUMNS } from '../common/domain/directory';
import { decodeCursor, encodeCursor } from '../common/pagination/cursor';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { projectAccess } from '../projects/project-access';
import { ProjectsRepository } from '../projects/projects.repository';
import type { CreatePostDto } from './dto/create-post.dto';
import type { PageQueryDto } from '../common/pagination/page-query.dto';
import type { PostsQueryDto } from './dto/posts-query.dto';
import type { UpdatePostDto } from './dto/update-post.dto';

import { PostsRepository } from './posts.repository';
import type { Post } from './posts.types';
import type { User } from '../users/users.types';

type Task = Extract<Post, { type: 'task' }>;

const DEFAULT_STATUSES: readonly string[] = DEFAULT_COLUMNS.map(
  (column) => column.name,
);

@Injectable()
export class PostsService {
  constructor(
    private readonly posts: PostsRepository,
    private readonly chats: ChatsService,
    private readonly projects: ProjectsRepository,
    private readonly notifications: NotificationsService,
    private readonly events: ChatEventsPublisher,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(CompanyMemberEntity)
    private readonly companyMembers: Repository<CompanyMemberEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly teamMembers: Repository<TeamMemberEntity>,
  ) {}

  async findPage(
    {
      type,
      direction,
      companyId,
      projectId,
      scope,
      cursor,
      limit,
    }: PostsQueryDto,
    viewerId: string,
  ) {
    const decoded = cursor ? decodeCursor(cursor) : null;
    if (cursor && !decoded) throw new BadRequestException('Invalid cursor');

    if (projectId) await this.requireBoardAccess(projectId, viewerId);

    const found = await this.posts.findMany({
      viewerId,
      ...(type ? { type } : {}),
      ...(direction ? { direction } : {}),
      ...(companyId ? { companyId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(scope ? { scope } : {}),
      ...(decoded ? { cursor: decoded } : {}),
      limit: limit + 1,
    });

    const items = found.slice(0, limit);
    const last = items.at(-1);

    return {
      items,
      nextCursor: found.length > limit && last ? encodeCursor(last) : null,
    };
  }

  async findById(id: string, viewerId: string) {
    const post = await this.posts.findById(id, viewerId);
    if (!post) throw new NotFoundException('Post not found');

    if (post.type === 'task' && post.isPrivate) {
      await this.requireTaskAccess(post, viewerId);
    }

    return post;
  }

  async create(authorId: string, dto: CreatePostDto) {
    await this.assertMayPostAs(dto.companyId, authorId);

    const details = await this.details(dto, authorId);
    const post = await this.posts.create({ authorId, ...details });

    if (post.type === 'event') {
      await this.chats.ensureEventChat(post.id, authorId);
    }

    if (post.type === 'task' && post.projectId) {
      await this.chats.boardChanged(post.projectId);
    }

    return post;
  }

  async chatOf(postId: string, viewerId: string) {
    const post = await this.findById(postId, viewerId);

    if (post.type === 'vacancy' || post.type === 'task') {
      throw new NotFoundException('This post has one chat per response');
    }

    const chat = await this.chats.findChatOfPost(post.id, post.type);
    if (!chat) throw new NotFoundException('This post has no chat yet');
    return chat;
  }

  async comment(
    postId: string,
    author: User,
    input: { id?: string; body: string },
  ) {
    const post = await this.findById(postId, author.id);

    if (post.type !== 'content') {
      throw AppException.validation('Only a content post takes comments');
    }

    const chat = await this.chats.ensureContentChat(post.id, post.author.id);
    await this.chats.join(chat, author.id);

    return this.chats.send(chat.id, author, input);
  }

  async update(id: string, authorId: string, dto: UpdatePostDto) {
    const post = await this.requireOwned(id, authorId);

    if (dto.type !== post.type) {
      throw AppException.validation('A post cannot change its type', {
        type: [`The type is fixed at ${post.type}`],
      });
    }

    await this.assertMayPostAs(dto.companyId, authorId);

    const details = await this.details(dto, authorId);

    if (details.type === 'task' && post.type === 'task') {
      await this.assertPrivacyFits(post, details.isPrivate);
    }

    const updated = await this.posts.update(id, details, authorId);

    if (updated.type === 'task' && updated.projectId) {
      await this.chats.boardChanged(updated.projectId);
    }

    return updated;
  }

  async remove(id: string, authorId: string) {
    const post = await this.requireOwned(id, authorId);
    await this.posts.delete(id);

    if (post.type === 'task' && post.projectId) {
      await this.chats.boardChanged(post.projectId);
    }
  }

  async setStatus(id: string, actor: User, status: string) {
    const task = await this.requireTask(id, actor.id);
    const ctx = await this.taskContext(task, actor.id);
    const isAssignee = task.assignees.some((user) => user.id === actor.id);

    if (!projectAccess.moveTask(ctx, task.author.id === actor.id, isAssignee)) {
      throw new ForbiddenException('This board is not yours to rearrange');
    }

    await this.assertStatusExists(task.projectId, status);
    await this.posts.setStatus(id, status);

    if (task.projectId) await this.chats.boardChanged(task.projectId);

    return this.findById(id, actor.id);
  }

  async assign(id: string, actor: User, userId: string) {
    const task = await this.requireTask(id, actor.id);

    if (!task.projectId) {
      throw AppException.validation(
        'A task outside a project takes no assignee: accept an offer instead',
      );
    }

    const project = await this.projects.findById(task.projectId);
    if (!project) throw new NotFoundException('Project not found');

    const ctx = await this.taskContext(task, actor.id);

    if (!projectAccess.assign(ctx)) {
      throw new ForbiddenException('Only the project manager assigns tasks');
    }

    if (!(await this.isTeamMember(project.team.id, userId))) {
      throw AppException.validation(
        'Add this person to the team before putting them on a task',
      );
    }

    if (task.assignees.some((user) => user.id === userId)) {
      return this.findById(id, actor.id);
    }

    await this.dataSource.transaction(async (manager) => {
      await this.posts.addAssignee(id, userId, manager);
      await this.posts.setPrivate(id, true, manager);
      await this.notifications.create(
        { userId, actorId: actor.id, postId: id, type: 'task_assigned' },
        manager,
      );
    });

    if (userId !== actor.id) this.events.notificationCreated(userId);
    await this.chats.boardChanged(task.projectId);
    return this.findById(id, actor.id);
  }

  async unassign(id: string, actor: User, userId: string) {
    const task = await this.requireTask(id, actor.id);
    const ctx = await this.taskContext(task, actor.id);

    if (userId !== actor.id && !projectAccess.assign(ctx)) {
      throw new ForbiddenException('Only the project manager assigns tasks');
    }

    await this.posts.removeAssignee(id, userId);

    if (task.projectId) await this.chats.boardChanged(task.projectId);
    return this.findById(id, actor.id);
  }

  async like(id: string, userId: string) {
    await this.requireExists(id);
    await this.posts.like(id, userId);
  }

  async unlike(id: string, userId: string) {
    await this.requireExists(id);
    await this.posts.unlike(id, userId);
  }

  async save(id: string, user: User) {
    await this.requireExists(id);
    return this.chats.saveToFavorites(id, user);
  }

  async unsave(id: string, userId: string) {
    await this.requireExists(id);
    await this.chats.removeFromFavorites(id, userId);
  }

  async findLikePage(id: string, { cursor, limit }: PageQueryDto) {
    await this.requireExists(id);

    const decoded = cursor ? decodeCursor(cursor) : null;
    if (cursor && !decoded) throw new BadRequestException('Invalid cursor');

    const found = await this.posts.findLikes({
      postId: id,
      ...(decoded ? { cursor: decoded } : {}),
      limit: limit + 1,
    });

    const items = found.slice(0, limit);
    const last = items.at(-1);

    return {
      items: items.map((like) => like.user),
      nextCursor:
        found.length > limit && last
          ? encodeCursor({ createdAt: last.createdAt, id: last.user.id })
          : null,
    };
  }

  private async details(dto: CreatePostDto, authorId: string) {
    if (dto.type !== 'task') return dto;

    const projectId = dto.projectId ?? null;

    if (projectId) await this.assertMayWriteTasks(projectId, authorId);
    await this.assertStatusExists(projectId, dto.status);

    return {
      ...dto,
      projectId,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
    };
  }

  private async assertPrivacyFits(task: Task, isPrivate: boolean) {
    if (isPrivate) return;

    if ((await this.posts.countAssignees(task.id)) > 0) {
      throw AppException.validation(
        'A task with an assignee cannot be public',
        { isPrivate: ['Take the assignee off first'] },
      );
    }
  }

  private async assertStatusExists(projectId: string | null, status: string) {
    const names = projectId
      ? (await this.projects.findColumns(projectId)).map(
          (column) => column.name,
        )
      : DEFAULT_STATUSES;

    if (!names.includes(status)) {
      throw AppException.validation('This board has no such column', {
        status: [`Pick one of: ${names.join(', ')}`],
      });
    }
  }

  private async taskContext(task: Task, userId: string) {
    if (!task.projectId) {
      return {
        userId,
        membersCanEditTasks: false,
        isManager: task.author.id === userId,
        isMember: task.author.id === userId,
        isCompanyOwner: false,
      };
    }

    const project = await this.projects.findById(task.projectId);
    const membership = await this.projects.findMembership(
      task.projectId,
      userId,
    );

    return {
      userId,
      membersCanEditTasks: project?.membersCanEditTasks ?? false,
      ...membership,
    };
  }

  private async requireTask(id: string, viewerId: string) {
    const post = await this.findById(id, viewerId);

    if (post.type !== 'task') {
      throw AppException.validation('This post is not a task');
    }

    return post;
  }

  private async requireTaskAccess(task: Task, viewerId: string) {
    if (task.author.id === viewerId) return;
    if (task.assignees.some((user) => user.id === viewerId)) return;

    if (task.projectId) {
      const ctx = await this.taskContext(task, viewerId);
      if (projectAccess.view(ctx)) return;
    }

    throw new NotFoundException('Post not found');
  }

  private async requireBoardAccess(projectId: string, viewerId: string) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const membership = await this.projects.findMembership(projectId, viewerId);
    const ctx = {
      userId: viewerId,
      membersCanEditTasks: project.membersCanEditTasks,
      ...membership,
    };

    if (!projectAccess.view(ctx)) {
      throw new NotFoundException('Project not found');
    }
  }

  private async assertMayWriteTasks(projectId: string, userId: string) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const membership = await this.projects.findMembership(projectId, userId);
    const ctx = {
      userId,
      membersCanEditTasks: project.membersCanEditTasks,
      ...membership,
    };

    if (!projectAccess.view(ctx)) {
      throw new NotFoundException('Project not found');
    }

    if (!projectAccess.writeTasks(ctx)) {
      throw new ForbiddenException('This project does not let you add tasks');
    }
  }

  private isTeamMember(teamId: string, userId: string) {
    return this.teamMembers.existsBy({ teamId, userId });
  }

  private async assertMayPostAs(
    companyId: string | null | undefined,
    authorId: string,
  ) {
    if (!companyId) return;

    const works = await this.companyMembers.existsBy({
      companyId,
      userId: authorId,
    });

    if (!works) {
      throw AppException.validation(
        'You can only post on behalf of a company you work for',
      );
    }
  }

  private async requireExists(id: string) {
    if (!(await this.posts.exists(id))) {
      throw new NotFoundException('Post not found');
    }
  }

  private async requireOwned(id: string, authorId: string) {
    const post = await this.findById(id, authorId);

    if (post.author.id !== authorId) {
      throw new ForbiddenException('You can only change your own posts');
    }

    return post;
  }
}
