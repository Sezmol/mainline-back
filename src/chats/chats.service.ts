import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { AppException } from '../common/errors/app.exception';
import { decodeCursor } from '../common/pagination/cursor';
import { AfterCommit } from '../infra/database/after-commit';
import { UsersService } from '../users/users.service';
import type { GroupChatType } from '../common/domain/directory';
import type { User } from '../users/users.types';
import { ChatEventsPublisher } from './chat-events.publisher';
import { ChatsRepository } from './chats.repository';
import {
  ChatExistsError,
  MessageExistsError,
  MissingPostError,
  type Chat,
  type ChatListItem,
  type CreateChatInput,
  type Membership,
} from './chats.types';
import { dedupeKey } from './dedupe-key';
import type { ChatListQueryDto } from './dto/chat-queries.dto';

interface Page {
  cursor?: string;
  limit: number;
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly chats: ChatsRepository,
    private readonly users: UsersService,
    private readonly events: ChatEventsPublisher,
    private readonly afterCommit: AfterCommit,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  ensureFavorites(userId: string, manager?: EntityManager) {
    return this.ensure(
      {
        type: 'favorites',
        dedupeKey: dedupeKey.favorites(userId),
        ownerId: userId,
        participantIds: [userId],
      },
      manager,
    );
  }

  ensureVacancyChat(
    postId: string,
    authorId: string,
    responderId: string,
    manager?: EntityManager,
  ) {
    return this.ensure(
      {
        type: 'vacancy',
        dedupeKey: dedupeKey.vacancy(postId, responderId),
        postId,
        ownerId: authorId,
        participantIds: [authorId, responderId],
      },
      manager,
    );
  }

  ensureTaskChat(
    postId: string,
    authorId: string,
    responderId: string,
    manager?: EntityManager,
  ) {
    return this.ensure(
      {
        type: 'task',
        dedupeKey: dedupeKey.task(postId, responderId),
        postId,
        ownerId: authorId,
        participantIds: [authorId, responderId],
      },
      manager,
    );
  }

  ensureEventChat(postId: string, authorId: string, manager?: EntityManager) {
    return this.ensure(
      {
        type: 'event',
        dedupeKey: dedupeKey.event(postId),
        postId,
        ownerId: authorId,
        participantIds: [authorId],
      },
      manager,
    );
  }

  ensureContentChat(postId: string, authorId: string, manager?: EntityManager) {
    return this.ensure(
      {
        type: 'content',
        dedupeKey: dedupeKey.content(postId),
        postId,
        ownerId: authorId,
        participantIds: [authorId],
      },
      manager,
    );
  }

  findChatOfPost(postId: string, type: 'event' | 'content') {
    return this.chats.findByDedupeKey(dedupeKey[type](postId));
  }

  async join(
    chat: Chat,
    userId: string,
    manager?: EntityManager,
    revive = false,
  ) {
    const joined = manager
      ? await this.chats.addParticipant(chat.id, userId, manager, revive)
      : await this.dataSource.transaction((tx) =>
          this.chats.addParticipant(chat.id, userId, tx, revive),
        );

    if (joined) {
      this.afterCommit.run(manager, () =>
        this.events.chatCreated(chat, [userId]),
      );
    }
  }

  ensureCompanyChat(
    company: { id: string; name: string },
    ownerId: string,
    manager: EntityManager,
  ) {
    return this.ensureGroup('company', company, ownerId, manager);
  }

  ensureDepartmentChat(
    department: { id: string; name: string },
    ownerId: string,
    manager: EntityManager,
  ) {
    return this.ensureGroup('department', department, ownerId, manager);
  }

  ensureTeamChat(
    team: { id: string; name: string },
    ownerId: string,
    manager: EntityManager,
  ) {
    return this.ensureGroup('team', team, ownerId, manager);
  }

  ensureProjectChat(
    project: { id: string; name: string },
    ownerId: string,
    manager: EntityManager,
  ) {
    return this.ensureGroup('project', project, ownerId, manager);
  }

  async joinTeamProjectChats(
    teamId: string,
    userId: string,
    manager: EntityManager,
  ) {
    for (const chat of await this.chats.findProjectChatsOfTeam(
      teamId,
      manager,
    )) {
      await this.join(chat, userId, manager, true);
    }
  }

  async leaveTeamProjectChats(
    teamId: string,
    userId: string,
    manager: EntityManager,
  ) {
    for (const chat of await this.chats.findProjectChatsOfTeam(
      teamId,
      manager,
    )) {
      if (await this.chats.removeParticipantIn(chat.id, userId, manager)) {
        this.afterCommit.run(manager, () =>
          this.events.participantRemoved(chat.id, userId),
        );
      }
    }
  }

  async boardChanged(projectId: string) {
    const chat = await this.chats.findByDedupeKey(dedupeKey.project(projectId));
    if (chat) this.events.boardChanged(chat.id, projectId);
  }

  joinGroup(chat: Chat, userId: string, manager: EntityManager) {
    return this.join(chat, userId, manager, true);
  }

  async joinGroupChat(
    type: GroupChatType,
    containerId: string,
    userId: string,
    manager: EntityManager,
  ) {
    const chat = await this.requireGroupChat(type, containerId, manager);
    return this.join(chat, userId, manager, true);
  }

  async leaveGroup(
    type: GroupChatType,
    containerId: string,
    userId: string,
    manager: EntityManager,
  ) {
    const chat = await this.chats.findByDedupeKey(
      dedupeKey[type](containerId),
      manager,
    );
    if (!chat) return;

    if (await this.chats.removeParticipantIn(chat.id, userId, manager)) {
      this.afterCommit.run(manager, () =>
        this.events.participantRemoved(chat.id, userId),
      );
    }
  }

  async leaveCompanyChats(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ) {
    const chatIds = await this.chats.removeFromCompanyChats(
      companyId,
      userId,
      manager,
    );

    this.afterCommit.run(manager, () => {
      for (const chatId of chatIds) {
        this.events.participantRemoved(chatId, userId);
      }
    });
  }

  async renameGroup(
    type: GroupChatType,
    containerId: string,
    title: string,
    manager: EntityManager,
  ) {
    const chat = await this.chats.findByDedupeKey(
      dedupeKey[type](containerId),
      manager,
    );
    if (!chat) return;

    const updated = await this.chats.setTitle(chat.id, title, manager);
    this.afterCommit.run(manager, () => this.events.chatUpdated(updated));
  }

  async deleteGroupChat(
    type: GroupChatType,
    containerId: string,
    manager: EntityManager,
  ) {
    const chat = await this.chats.findByDedupeKey(
      dedupeKey[type](containerId),
      manager,
    );
    if (!chat) return;

    const participants = await this.chats.findParticipants(chat.id);
    await this.chats.deleteByDedupeKey(dedupeKey[type](containerId), manager);

    this.afterCommit.run(manager, () => {
      for (const participant of participants) {
        this.events.participantRemoved(chat.id, participant.user.id);
      }
    });
  }

  async setGroupOwner(
    type: GroupChatType,
    containerId: string,
    ownerId: string,
    manager: EntityManager,
  ) {
    const chat = await this.requireGroupChat(type, containerId, manager);
    const updated = await this.chats.setOwner(chat.id, ownerId, manager);

    this.afterCommit.run(manager, () => this.events.chatUpdated(updated));
  }

  findGroupChat(type: GroupChatType, containerId: string) {
    return this.chats.findByDedupeKey(dedupeKey[type](containerId));
  }

  private ensureGroup(
    type: GroupChatType,
    container: { id: string; name: string },
    ownerId: string,
    manager: EntityManager,
  ) {
    return this.ensure(
      {
        type,
        dedupeKey: dedupeKey[type](container.id),
        title: container.name,
        ownerId,
        participantIds: [],
      },
      manager,
    );
  }

  private async requireGroupChat(
    type: GroupChatType,
    containerId: string,
    manager: EntityManager,
  ) {
    const chat = await this.chats.findByDedupeKey(
      dedupeKey[type](containerId),
      manager,
    );

    if (!chat)
      throw new Error(`Group chat for ${type}:${containerId} is missing`);
    return chat;
  }

  async createPrivate(actor: User, userId: string) {
    if (userId === actor.id) {
      throw AppException.validation('Notes to yourself go to Favourites');
    }

    if (!(await this.users.findById(userId))) {
      throw new NotFoundException('User not found');
    }

    return this.ensure({
      type: 'private',
      dedupeKey: dedupeKey.private(actor.id, userId),
      participantIds: [actor.id, userId],
    });
  }

  async list(userId: string, query: ChatListQueryDto) {
    const items = await this.chats.findMany({
      userId,
      archived: query.archived,
      ...(query.type ? { type: query.type } : {}),
      ...this.page(query),
    });

    return items.map((item) => this.toView(item));
  }

  async findById(chatId: string, viewerId: string) {
    const item = await this.chats.findOne(chatId, viewerId);

    if (!item || item.membership.removedAt !== null) {
      throw new NotFoundException('Chat not found');
    }

    return this.toView(item);
  }

  async participants(chatId: string, viewerId: string) {
    const { chat } = await this.requireMembership(chatId, viewerId);

    if (chat.type === 'content') {
      throw new ForbiddenException('A content chat does not show who is in it');
    }

    return this.chats.findParticipants(chatId);
  }

  async messages(chatId: string, viewerId: string, query: Page) {
    const chat = await this.chats.findById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');

    if (chat.type !== 'content') {
      await this.requireMembership(chatId, viewerId);
    }

    return this.chats.findMessages({ chatId, ...this.page(query) });
  }

  async send(
    chatId: string,
    author: User,
    input: { id?: string; body: string; postId?: string },
  ) {
    const { chat, membership } = await this.requireMembership(
      chatId,
      author.id,
    );

    if (!this.mayWrite(chat, membership)) {
      throw new ForbiddenException('You cannot write in this chat');
    }

    try {
      const message = await this.dataSource.transaction((manager) =>
        this.chats.createMessage(
          { chatId, authorId: author.id, ...input },
          manager,
        ),
      );

      this.events.messageCreated(message);
      return message;
    } catch (error) {
      if (error instanceof MissingPostError) {
        throw AppException.validation('That post does not exist');
      }
      if (error instanceof MessageExistsError && input.id) {
        return this.findResentMessage(chatId, author.id, input.id);
      }
      throw error;
    }
  }

  private async findResentMessage(
    chatId: string,
    authorId: string,
    id: string,
  ) {
    const message = await this.chats.findMessage(chatId, id);

    if (message?.author.id !== authorId) {
      throw AppException.conflict('This message id is already taken');
    }

    return message;
  }

  async saveToFavorites(postId: string, user: User) {
    const chat = await this.ensureFavorites(user.id);
    const [saved] = await this.chats.findMessagesOfPost(chat.id, postId);

    return saved ?? this.send(chat.id, user, { body: '', postId });
  }

  async removeFromFavorites(postId: string, userId: string) {
    const chat = await this.chats.findByDedupeKey(dedupeKey.favorites(userId));
    if (!chat) return;

    const saved = await this.chats.findMessagesOfPost(chat.id, postId);

    for (const message of saved) {
      await this.chats.deleteMessage(chat.id, message.id);
      this.events.messageDeleted(chat.id, message.id);
    }
  }

  async deleteMessage(chatId: string, messageId: string, actor: User) {
    await this.requireMembership(chatId, actor.id);

    const message = await this.chats.findMessage(chatId, messageId);
    if (!message) throw new NotFoundException('Message not found');

    if (message.author.id !== actor.id) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.chats.deleteMessage(chatId, messageId);
    this.events.messageDeleted(chatId, messageId);
  }

  async markRead(chatId: string, viewerId: string, messageId: string) {
    await this.requireMembership(chatId, viewerId);

    if (!(await this.chats.findMessage(chatId, messageId))) {
      throw new NotFoundException('Message not found');
    }

    const unreadCount = await this.chats.markRead(chatId, viewerId, messageId);

    this.events.unreadChanged(chatId, viewerId, unreadCount);

    return { unreadCount };
  }

  async archive(chatId: string, viewerId: string, archived: boolean) {
    await this.requireMembership(chatId, viewerId);
    await this.chats.setArchived(chatId, viewerId, archived);

    return this.findById(chatId, viewerId);
  }

  async setWriteRestricted(
    chatId: string,
    actor: User,
    writeRestricted: boolean,
  ) {
    await this.requireEventOwner(chatId, actor.id);

    const chat = await this.chats.setWriteRestricted(chatId, writeRestricted);
    this.events.chatUpdated(chat);

    return chat;
  }

  async setCanWrite(
    chatId: string,
    actor: User,
    userId: string,
    canWrite: boolean,
  ) {
    await this.requireEventOwner(chatId, actor.id);

    if (userId === actor.id) {
      throw AppException.validation(
        'The owner always keeps the right to write',
      );
    }

    const participant = await this.chats.setCanWrite(chatId, userId, canWrite);
    if (!participant) throw new NotFoundException('Participant not found');

    this.events.writeAccessChanged(chatId, userId, canWrite);
    return participant;
  }

  async removeParticipant(chatId: string, actor: User, userId: string) {
    const chat = await this.requireEventOwner(chatId, actor.id);

    if (userId === chat.owner?.id) {
      throw AppException.validation('The owner cannot be removed');
    }

    if (!(await this.chats.removeParticipant(chatId, userId))) {
      throw new NotFoundException('Participant not found');
    }

    this.events.participantRemoved(chatId, userId);
  }

  private mayWrite(chat: Chat, membership: Membership) {
    return (
      membership.removedAt === null &&
      membership.canWrite &&
      (!chat.writeRestricted || chat.owner?.id === membership.userId)
    );
  }

  private toView({ chat, membership, ...rest }: ChatListItem) {
    return {
      chat,
      ...rest,
      archived: membership.archivedAt !== null,
      canWrite: this.mayWrite(chat, membership),
    };
  }

  private async requireEventOwner(chatId: string, userId: string) {
    const { chat } = await this.requireMembership(chatId, userId);

    if (chat.type !== 'event') {
      throw AppException.validation('Only an event chat is moderated');
    }

    if (chat.owner?.id !== userId) {
      throw new ForbiddenException('Only the author of the event can do that');
    }

    return chat;
  }

  private async requireMembership(chatId: string, userId: string) {
    const [chat, membership] = await Promise.all([
      this.chats.findById(chatId),
      this.chats.findMembership(chatId, userId),
    ]);

    if (!chat || !membership || membership.removedAt !== null) {
      throw new NotFoundException('Chat not found');
    }

    return { chat, membership };
  }

  private page({ cursor, limit }: Page) {
    const decoded = cursor ? decodeCursor(cursor) : null;

    if (cursor && !decoded) {
      throw AppException.validation('That page cursor is not readable');
    }

    return { limit, ...(decoded ? { cursor: decoded } : {}) };
  }

  private async ensure(input: CreateChatInput, manager?: EntityManager) {
    const existing = await this.chats.findByDedupeKey(input.dedupeKey, manager);
    if (existing) return existing;

    try {
      const chat = manager
        ? await this.chats.create(input, manager)
        : await this.dataSource.transaction((tx) =>
            this.chats.create(input, tx),
          );

      this.afterCommit.run(manager, () =>
        this.events.chatCreated(chat, input.participantIds),
      );
      return chat;
    } catch (error) {
      if (!(error instanceof ChatExistsError)) throw error;

      const found = await this.chats.findByDedupeKey(input.dedupeKey);
      if (!found) throw error;
      return found;
    }
  }
}
