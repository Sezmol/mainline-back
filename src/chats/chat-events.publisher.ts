import type { Chat, Message } from './chats.types';

export abstract class ChatEventsPublisher {
  abstract messageCreated(message: Message): void;
  abstract messageDeleted(chatId: string, messageId: string): void;
  abstract chatCreated(chat: Chat, userIds: string[]): void;
  abstract chatUpdated(chat: Chat): void;
  abstract participantRemoved(chatId: string, userId: string): void;
  abstract writeAccessChanged(
    chatId: string,
    userId: string,
    canWrite: boolean,
  ): void;
  abstract unreadChanged(
    chatId: string,
    userId: string,
    unreadCount: number,
  ): void;
  abstract notificationCreated(userId: string): void;
  abstract boardChanged(chatId: string, projectId: string): void;
}
