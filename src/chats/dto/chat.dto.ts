import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CHAT_TYPES, POST_TYPES } from '../../common/domain/directory';
import { publicUserSchema, toPublicUser } from '../../users/dto/user.dto';
import type { Chat, ChatView, Message } from '../chats.types';

export const chatSchema = z.object({
  id: z.string(),
  type: z.enum(CHAT_TYPES),
  post: z
    .object({
      id: z.string(),
      type: z.enum(POST_TYPES),
      title: z.string(),
    })
    .nullable(),
  owner: publicUserSchema.nullable(),
  title: z.string().nullable(),
  writeRestricted: z.boolean(),
  lastMessageAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

export class ChatDto extends createZodDto(chatSchema) {}

export const toChatDto = (chat: Chat) => ({
  id: chat.id,
  type: chat.type,
  post: chat.post,
  owner: chat.owner ? toPublicUser(chat.owner) : null,
  title: chat.title,
  writeRestricted: chat.writeRestricted,
  lastMessageAt: chat.lastMessageAt.toISOString(),
  createdAt: chat.createdAt.toISOString(),
});

export const messageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  author: publicUserSchema,
  body: z.string(),
  postId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  editedAt: z.iso.datetime().nullable(),
});

export class MessageDto extends createZodDto(messageSchema) {}

export const toMessageDto = (message: Message) => ({
  id: message.id,
  chatId: message.chatId,
  author: toPublicUser(message.author),
  body: message.body,
  postId: message.postId,
  createdAt: message.createdAt.toISOString(),
  editedAt: message.editedAt?.toISOString() ?? null,
});

export const messagePageSchema = z.object({
  items: z.array(messageSchema),
  nextCursor: z.string().nullable(),
});

export class MessagePageDto extends createZodDto(messagePageSchema) {}

export const chatViewSchema = z.object({
  chat: chatSchema,
  companion: publicUserSchema.nullable(),
  lastMessage: messageSchema.nullable(),
  unreadCount: z.number().int(),
  archived: z.boolean(),
  canWrite: z.boolean(),
});

export class ChatViewDto extends createZodDto(chatViewSchema) {}

export const toChatViewDto = (view: ChatView) => ({
  chat: toChatDto(view.chat),
  companion: view.companion ? toPublicUser(view.companion) : null,
  lastMessage: view.lastMessage ? toMessageDto(view.lastMessage) : null,
  unreadCount: view.unreadCount,
  archived: view.archived,
  canWrite: view.canWrite,
});

export const chatPageSchema = z.object({
  items: z.array(chatViewSchema),
  nextCursor: z.string().nullable(),
});

export class ChatPageDto extends createZodDto(chatPageSchema) {}

export const chatParticipantSchema = z.object({
  user: publicUserSchema,
  canWrite: z.boolean(),
  joinedAt: z.iso.datetime(),
});

export class ChatParticipantDto extends createZodDto(chatParticipantSchema) {}

export const unreadSchema = z.object({ unreadCount: z.number().int() });

export class UnreadDto extends createZodDto(unreadSchema) {}
