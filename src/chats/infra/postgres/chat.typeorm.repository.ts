import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository, type EntityManager } from 'typeorm';
import {
  asForeignKeyViolation,
  asUniqueViolation,
} from '../../../infra/database/unique-violation';
import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { User } from '../../../users/users.types';
import { ChatsRepository } from '../../chats.repository';
import {
  ChatExistsError,
  MessageExistsError,
  MissingPostError,
  type Chat,
  type ChatListItem,
  type CreateChatInput,
  type CreateMessageInput,
  type FindChatsQuery,
  type FindMessagesQuery,
  type Membership,
} from '../../chats.types';
import { ChatParticipantEntity } from './chat-participant.entity';
import { ChatEntity } from './chat.entity';
import { toChat, toMembership, toParticipant } from './chat.mapper';
import { MessageEntity } from './message.entity';
import { toMessage } from './message.mapper';

interface UnreadRow {
  chatId: string;
  unreadCount: number;
}

const CHAT_RELATIONS = { post: true, owner: true } as const;

@Injectable()
export class ChatTypeormRepository extends ChatsRepository {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chats: Repository<ChatEntity>,
    @InjectRepository(ChatParticipantEntity)
    private readonly participants: Repository<ChatParticipantEntity>,
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
  ) {
    super();
  }

  async create(
    { participantIds, ...input }: CreateChatInput,
    manager: EntityManager,
  ) {
    const chats = manager.getRepository(ChatEntity);

    let id: string;
    try {
      ({ id } = await chats.save(chats.create(input)));
    } catch (error) {
      if (asUniqueViolation(error)) throw new ChatExistsError(input.dedupeKey);
      throw error;
    }

    const participants = manager.getRepository(ChatParticipantEntity);
    await participants.save(
      participantIds.map((userId) =>
        participants.create({ chatId: id, userId }),
      ),
    );

    const saved = await chats.findOne({
      where: { id },
      relations: CHAT_RELATIONS,
    });

    if (!saved) throw new Error(`Chat ${id} vanished right after a write`);
    return toChat(saved);
  }

  async findById(id: string): Promise<Chat | null> {
    const found = await this.chats.findOne({
      where: { id },
      relations: CHAT_RELATIONS,
    });

    return found ? toChat(found) : null;
  }

  async findByDedupeKey(dedupeKey: string, manager?: EntityManager) {
    const found = await this.chatRepository(manager).findOne({
      where: { dedupeKey },
      relations: CHAT_RELATIONS,
    });

    return found ? toChat(found) : null;
  }

  async findMany({ userId, archived, type, cursor, limit }: FindChatsQuery) {
    const query = this.participants
      .createQueryBuilder('participant')
      .innerJoinAndSelect('participant.chat', 'chat')
      .leftJoinAndSelect('chat.post', 'post')
      .leftJoinAndSelect('chat.owner', 'owner')
      .where('participant.userId = :userId', { userId })
      .andWhere('participant.removedAt is null')
      .andWhere(
        archived
          ? 'participant.archivedAt is not null'
          : 'participant.archivedAt is null',
      )
      .orderBy('chat.lastMessageAt', 'DESC')
      .addOrderBy('chat.id', 'DESC')
      .take(limit);

    if (type) query.andWhere('chat.type = :type', { type });

    if (cursor) {
      query.andWhere(
        '(chat.lastMessageAt, chat.id) < (:createdAt, :id)',
        cursor,
      );
    }

    return this.withPreviews(await query.getMany(), userId);
  }

  async findOne(chatId: string, userId: string) {
    const row = await this.participants.findOne({
      where: { chatId, userId },
      relations: { chat: { post: true, owner: true } },
    });

    if (!row) return null;

    const [item] = await this.withPreviews([row], userId);
    return item ?? null;
  }

  async findChatIds(userId: string) {
    const rows = await this.participants.find({
      where: { userId, removedAt: IsNull() },
      select: { chatId: true },
    });

    return rows.map((row) => row.chatId);
  }

  async findParticipants(chatId: string) {
    const found = await this.participants.find({
      where: { chatId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });

    return found
      .filter((participant) => participant.removedAt === null)
      .map(toParticipant);
  }

  async findMembership(
    chatId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<Membership | null> {
    const found = await this.participantRepository(manager).findOne({
      where: { chatId, userId },
    });

    return found ? toMembership(found) : null;
  }

  async addParticipant(
    chatId: string,
    userId: string,
    manager: EntityManager,
    revive = false,
  ) {
    const participants = manager.getRepository(ChatParticipantEntity);

    const inserted = await participants
      .createQueryBuilder()
      .insert()
      .values({ chatId, userId })
      .orIgnore()
      .returning('"userId"')
      .execute();

    if ((inserted.raw as unknown[]).length > 0) return true;
    if (!revive) return false;

    const { affected } = await participants.update(
      { chatId, userId, removedAt: Not(IsNull()) },
      { removedAt: null },
    );

    return (affected ?? 0) > 0;
  }

  async createMessage(input: CreateMessageInput, manager: EntityManager) {
    const messages = manager.getRepository(MessageEntity);

    let id: string;
    try {
      const { identifiers } = await messages.insert(messages.create(input));
      ({ id } = identifiers[0] as { id: string });
    } catch (error) {
      if (asForeignKeyViolation(error)) throw new MissingPostError();
      if (asUniqueViolation(error)) throw new MessageExistsError();
      throw error;
    }

    const saved = await messages.findOne({
      where: { id },
      relations: { author: true },
    });

    if (!saved) throw new Error(`Message ${id} vanished right after a write`);

    await manager
      .getRepository(ChatEntity)
      .update(input.chatId, { lastMessageAt: saved.createdAt });

    return toMessage(saved);
  }

  async findMessage(chatId: string, id: string) {
    const found = await this.messages.findOne({
      where: { id, chatId },
      relations: { author: true },
    });

    return found ? toMessage(found) : null;
  }

  async findMessagesOfPost(chatId: string, postId: string) {
    const found = await this.messages.find({
      where: { chatId, postId },
      relations: { author: true },
      order: { createdAt: 'ASC' },
    });

    return found.map(toMessage);
  }

  async deleteMessage(chatId: string, id: string) {
    await this.messages.delete(id);

    const last = await this.messages.findOne({
      where: { chatId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    if (last) {
      await this.chats.update(chatId, { lastMessageAt: last.createdAt });
    }
  }

  async findMessages({ chatId, cursor, limit }: FindMessagesQuery) {
    const query = this.messages
      .createQueryBuilder('message')
      .innerJoinAndSelect('message.author', 'author')
      .where('message.chatId = :chatId', { chatId })
      .orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(limit);

    if (cursor) {
      query.andWhere(
        '(message.createdAt, message.id) < (:createdAt, :id)',
        cursor,
      );
    }

    const found = await query.getMany();
    return found.map(toMessage);
  }

  async markRead(chatId: string, userId: string, messageId: string) {
    await this.participants
      .createQueryBuilder()
      .update()
      .set({
        lastReadAt: () =>
          'GREATEST("lastReadAt", (select "createdAt" from "messages" where "id" = :messageId and "chatId" = :chatId))',
      })
      .where('"chatId" = :chatId and "userId" = :userId')
      .setParameters({ chatId, userId, messageId })
      .execute();

    return (await this.unreadCounts([chatId], userId)).get(chatId) ?? 0;
  }

  async setWriteRestricted(chatId: string, writeRestricted: boolean) {
    await this.chats.update(chatId, { writeRestricted });

    const updated = await this.findById(chatId);
    if (!updated)
      throw new Error(`Chat ${chatId} vanished right after a write`);
    return updated;
  }

  async setCanWrite(chatId: string, userId: string, canWrite: boolean) {
    await this.participants.update(
      { chatId, userId, removedAt: IsNull() },
      { canWrite },
    );

    const updated = await this.participants.findOne({
      where: { chatId, userId, removedAt: IsNull() },
      relations: { user: true },
    });

    return updated ? toParticipant(updated) : null;
  }

  async removeParticipant(chatId: string, userId: string) {
    const result = await this.participants.update(
      { chatId, userId, removedAt: IsNull() },
      { removedAt: new Date() },
    );

    return (result.affected ?? 0) > 0;
  }

  async setArchived(chatId: string, userId: string, archived: boolean) {
    await this.participants.update(
      { chatId, userId },
      { archivedAt: archived ? new Date() : null },
    );
  }

  async setTitle(chatId: string, title: string, manager: EntityManager) {
    await manager.getRepository(ChatEntity).update(chatId, { title });
    return this.reload(chatId, manager);
  }

  async setOwner(chatId: string, ownerId: string, manager: EntityManager) {
    await manager.getRepository(ChatEntity).update(chatId, { ownerId });
    return this.reload(chatId, manager);
  }

  async deleteByDedupeKey(dedupeKey: string, manager: EntityManager) {
    await manager.getRepository(ChatEntity).delete({ dedupeKey });
  }

  async findProjectChatsOfTeam(teamId: string, manager?: EntityManager) {
    const found = await this.chatRepository(manager)
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.post', 'post')
      .leftJoinAndSelect('chat.owner', 'owner')
      .where(
        `chat."dedupeKey" IN (SELECT 'project:' || "id" FROM projects WHERE "teamId" = :teamId)`,
        { teamId },
      )
      .getMany();

    return found.map(toChat);
  }

  async removeFromCompanyChats(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ) {
    const rows = await manager.query<{ chatId: string }[]>(
      `UPDATE chat_participants cp
          SET "removedAt" = now()
         FROM chats c
        WHERE c."id" = cp."chatId"
          AND cp."userId" = $2::uuid
          AND cp."removedAt" IS NULL
          AND (
            c."dedupeKey" = 'company:' || $1::text
            OR c."dedupeKey" IN (SELECT 'department:' || "id" FROM departments WHERE "companyId" = $1::uuid)
            OR c."dedupeKey" IN (SELECT 'team:' || "id" FROM teams WHERE "companyId" = $1::uuid)
            OR c."dedupeKey" IN (
                 SELECT 'project:' || p."id" FROM projects p
                   JOIN teams t ON t."id" = p."teamId"
                  WHERE t."companyId" = $1::uuid
               )
          )
        RETURNING cp."chatId"`,
      [companyId, userId],
    );

    return rows.map((row) => row.chatId);
  }

  async removeParticipantIn(
    chatId: string,
    userId: string,
    manager: EntityManager,
  ) {
    const { affected } = await manager
      .getRepository(ChatParticipantEntity)
      .update(
        { chatId, userId, removedAt: IsNull() },
        { removedAt: new Date() },
      );

    return (affected ?? 0) > 0;
  }

  private async reload(chatId: string, manager: EntityManager) {
    const found = await manager.getRepository(ChatEntity).findOne({
      where: { id: chatId },
      relations: CHAT_RELATIONS,
    });

    if (!found) throw new Error(`Chat ${chatId} vanished right after a write`);
    return toChat(found);
  }

  private async withPreviews(rows: ChatParticipantEntity[], userId: string) {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.chatId);
    const [lastMessages, unread, companions] = await Promise.all([
      this.lastMessages(ids),
      this.unreadCounts(ids, userId),
      this.companions(rows, userId),
    ]);

    return rows.map<ChatListItem>((row) => ({
      chat: toChat(row.chat),
      membership: toMembership(row),
      companion: companions.get(row.chatId) ?? null,
      lastMessage: lastMessages.get(row.chatId) ?? null,
      unreadCount: unread.get(row.chatId) ?? 0,
    }));
  }

  private async lastMessages(ids: string[]) {
    const found = await this.messages
      .createQueryBuilder('message')
      .distinctOn(['message.chatId'])
      .innerJoinAndSelect('message.author', 'author')
      .where('message.chatId in (:...ids)', { ids })
      .orderBy('message.chatId')
      .addOrderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .getMany();

    return new Map(
      found.map((message) => [message.chatId, toMessage(message)]),
    );
  }

  private async unreadCounts(ids: string[], userId: string) {
    const rows = await this.messages
      .createQueryBuilder('message')
      .select('message.chatId', 'chatId')
      .addSelect('count(*)::int', 'unreadCount')
      .innerJoin(
        ChatParticipantEntity,
        'participant',
        'participant.chatId = message.chatId and participant.userId = :userId',
      )
      .where('message.chatId in (:...ids)', { ids })
      .andWhere('message.authorId <> :userId')
      .andWhere(
        '(participant.lastReadAt is null or message.createdAt > participant.lastReadAt)',
      )
      .setParameter('userId', userId)
      .groupBy('message.chatId')
      .getRawMany<UnreadRow>();

    return new Map(rows.map((row) => [row.chatId, row.unreadCount]));
  }

  private async companions(rows: ChatParticipantEntity[], userId: string) {
    const ids = rows
      .filter(
        (row) => row.chat.type === 'private' || row.chat.type === 'vacancy',
      )
      .map((row) => row.chatId);

    if (ids.length === 0) return new Map<string, User>();

    const found = await this.participants.find({
      where: { chatId: In(ids) },
      relations: { user: true },
    });

    return new Map(
      found
        .filter((participant) => participant.userId !== userId)
        .map((participant) => [participant.chatId, toUser(participant.user)]),
    );
  }

  private chatRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(ChatEntity) : this.chats;
  }

  private participantRepository(manager?: EntityManager) {
    return manager
      ? manager.getRepository(ChatParticipantEntity)
      : this.participants;
  }
}
