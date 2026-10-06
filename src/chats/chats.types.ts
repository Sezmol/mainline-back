import type { ChatType, PostType } from '../common/domain/directory';
import type { Cursor } from '../common/pagination/cursor';
import type { User } from '../users/users.types';

export interface ChatPost {
  id: string;
  type: PostType;
  title: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  post: ChatPost | null;
  owner: User | null;
  title: string | null;
  writeRestricted: boolean;
  lastMessageAt: Date;
  createdAt: Date;
}

export interface ChatListItem {
  chat: Chat;
  membership: Membership;
  companion: User | null;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface ChatView {
  chat: Chat;
  companion: User | null;
  lastMessage: Message | null;
  unreadCount: number;
  archived: boolean;
  canWrite: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  author: User;
  body: string;
  postId: string | null;
  createdAt: Date;
  editedAt: Date | null;
}

export interface ChatParticipant {
  user: User;
  canWrite: boolean;
  joinedAt: Date;
}

export interface Membership {
  chatId: string;
  userId: string;
  canWrite: boolean;
  lastReadAt: Date | null;
  archivedAt: Date | null;
  removedAt: Date | null;
}

export interface CreateChatInput {
  type: ChatType;
  dedupeKey: string;
  postId?: string;
  ownerId?: string;
  title?: string;
  participantIds: string[];
}

export interface CreateMessageInput {
  id?: string;
  chatId: string;
  authorId: string;
  body: string;
  postId?: string;
}

export interface FindChatsQuery {
  userId: string;
  archived: boolean;
  type?: ChatType;
  cursor?: Cursor;
  limit: number;
}

export interface FindMessagesQuery {
  chatId: string;
  cursor?: Cursor;
  limit: number;
}

export class ChatExistsError extends Error {
  constructor(readonly dedupeKey: string) {
    super(`Chat ${dedupeKey} already exists`);
    this.name = 'ChatExistsError';
  }
}

export class MissingPostError extends Error {
  constructor() {
    super('The attached post does not exist');
    this.name = 'MissingPostError';
  }
}

export class MessageExistsError extends Error {
  constructor() {
    super('A message with this id already exists');
    this.name = 'MessageExistsError';
  }
}
