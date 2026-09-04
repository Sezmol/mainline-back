import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { DefaultEventsMap, Server } from 'socket.io';
import type { Env } from '../../config/env';
import { UsersService } from '../../users/users.service';
import { ChatEventsPublisher } from '../chat-events.publisher';
import { ChatsRepository } from '../chats.repository';
import type { Chat, Message } from '../chats.types';
import {
  toChatDto,
  toMessageDto,
  type ChatDto,
  type MessageDto,
} from '../dto/chat.dto';
import { wsAuth, type ChatSocket, type SocketData } from './ws-auth.middleware';

export interface ChatServerEvents {
  new_message: (payload: { chatId: string; message: MessageDto }) => void;
  message_deleted: (payload: { chatId: string; messageId: string }) => void;
  chat_created: (payload: { chat: ChatDto }) => void;
  chat_updated: (payload: { chat: ChatDto }) => void;
  chat_removed: (payload: { chatId: string }) => void;
  write_access_changed: (payload: {
    chatId: string;
    canWrite: boolean;
  }) => void;
  unread_changed: (payload: { chatId: string; unreadCount: number }) => void;
  notification_created: () => void;
  board_changed: (payload: { projectId: string }) => void;
}

type ChatServer = Server<
  DefaultEventsMap,
  ChatServerEvents,
  DefaultEventsMap,
  SocketData
>;

const userRoom = (userId: string) => `user:${userId}`;
const chatRoom = (chatId: string) => `chat:${chatId}`;

@WebSocketGateway()
export class ChatsGateway
  extends ChatEventsPublisher
  implements OnGatewayInit, OnGatewayConnection
{
  @WebSocketServer()
  private readonly server!: ChatServer;

  constructor(
    private readonly chats: ChatsRepository,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {
    super();
  }

  afterInit(server: ChatServer) {
    server.use(
      wsAuth({
        jwt: this.jwt,
        users: this.users,
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      }),
    );
  }

  async handleConnection(socket: ChatSocket) {
    const { user } = socket.data;
    const chatIds = await this.chats.findChatIds(user.id);

    await socket.join([userRoom(user.id), ...chatIds.map(chatRoom)]);
  }

  messageCreated(message: Message) {
    this.server.to(chatRoom(message.chatId)).emit('new_message', {
      chatId: message.chatId,
      message: toMessageDto(message),
    });
  }

  messageDeleted(chatId: string, messageId: string) {
    this.server.to(chatRoom(chatId)).emit('message_deleted', {
      chatId,
      messageId,
    });
  }

  chatCreated(chat: Chat, userIds: string[]) {
    const rooms = userIds.map(userRoom);

    this.server.in(rooms).socketsJoin(chatRoom(chat.id));
    this.server.to(rooms).emit('chat_created', { chat: toChatDto(chat) });
  }

  chatUpdated(chat: Chat) {
    this.server
      .to(chatRoom(chat.id))
      .emit('chat_updated', { chat: toChatDto(chat) });
  }

  participantRemoved(chatId: string, userId: string) {
    this.server.to(userRoom(userId)).emit('chat_removed', { chatId });
    this.server.in(userRoom(userId)).socketsLeave(chatRoom(chatId));
  }

  writeAccessChanged(chatId: string, userId: string, canWrite: boolean) {
    this.server
      .to(userRoom(userId))
      .emit('write_access_changed', { chatId, canWrite });
  }

  unreadChanged(chatId: string, userId: string, unreadCount: number) {
    this.server.to(userRoom(userId)).emit('unread_changed', {
      chatId,
      unreadCount,
    });
  }

  notificationCreated(userId: string) {
    this.server.to(userRoom(userId)).emit('notification_created');
  }

  boardChanged(chatId: string, projectId: string) {
    this.server.to(chatRoom(chatId)).emit('board_changed', { projectId });
  }
}
