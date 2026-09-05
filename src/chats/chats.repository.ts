import type { EntityManager } from 'typeorm';
import type {
  Chat,
  ChatListItem,
  ChatParticipant,
  CreateChatInput,
  CreateMessageInput,
  FindChatsQuery,
  FindMessagesQuery,
  Membership,
  Message,
} from './chats.types';

export abstract class ChatsRepository {
  abstract create(
    input: CreateChatInput,
    manager: EntityManager,
  ): Promise<Chat>;
  abstract findById(id: string): Promise<Chat | null>;
  abstract findByDedupeKey(
    dedupeKey: string,
    manager?: EntityManager,
  ): Promise<Chat | null>;
  abstract findMany(query: FindChatsQuery): Promise<ChatListItem[]>;
  abstract findOne(
    chatId: string,
    userId: string,
  ): Promise<ChatListItem | null>;
  abstract findChatIds(userId: string): Promise<string[]>;
  abstract findParticipants(chatId: string): Promise<ChatParticipant[]>;
  abstract findMembership(
    chatId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<Membership | null>;
  abstract addParticipant(
    chatId: string,
    userId: string,
    manager: EntityManager,
    revive?: boolean,
  ): Promise<Membership>;
  abstract createMessage(
    input: CreateMessageInput,
    manager: EntityManager,
  ): Promise<Message>;
  abstract findMessages(query: FindMessagesQuery): Promise<Message[]>;
  abstract findMessage(chatId: string, id: string): Promise<Message | null>;
  abstract findMessagesOfPost(
    chatId: string,
    postId: string,
  ): Promise<Message[]>;
  abstract deleteMessage(chatId: string, id: string): Promise<void>;
  abstract markRead(
    chatId: string,
    userId: string,
    messageId: string,
  ): Promise<number>;
  abstract setWriteRestricted(
    chatId: string,
    writeRestricted: boolean,
  ): Promise<Chat>;
  abstract setCanWrite(
    chatId: string,
    userId: string,
    canWrite: boolean,
  ): Promise<ChatParticipant | null>;
  abstract removeParticipant(chatId: string, userId: string): Promise<boolean>;
  abstract setArchived(
    chatId: string,
    userId: string,
    archived: boolean,
  ): Promise<void>;

  abstract setTitle(
    chatId: string,
    title: string,
    manager: EntityManager,
  ): Promise<Chat>;
  abstract setOwner(
    chatId: string,
    ownerId: string,
    manager: EntityManager,
  ): Promise<Chat>;
  abstract deleteByDedupeKey(
    dedupeKey: string,
    manager: EntityManager,
  ): Promise<void>;

  abstract findProjectChatsOfTeam(
    teamId: string,
    manager?: EntityManager,
  ): Promise<Chat[]>;
  abstract removeFromCompanyChats(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<string[]>;

  abstract removeParticipantIn(
    chatId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<boolean>;
}
