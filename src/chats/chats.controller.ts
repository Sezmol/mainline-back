import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { PageQueryDto } from '../common/pagination/page-query.dto';
import { toPublicUser } from '../users/dto/user.dto';
import type { User } from '../users/users.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatsService } from './chats.service';
import {
  ArchiveChatDto,
  ChatSettingsDto,
  ParticipantWriteDto,
} from './dto/chat-controls.dto';
import { ChatListQueryDto, ReadChatDto } from './dto/chat-queries.dto';
import {
  ChatDto,
  ChatPageDto,
  ChatParticipantDto,
  ChatViewDto,
  MessageDto,
  MessagePageDto,
  UnreadDto,
  toChatDto,
  toChatViewDto,
  toMessageDto,
} from './dto/chat.dto';
import { CreateChatDto } from './dto/create-chat.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@ApiTags('chats')
@ApiCookieAuth('access_token')
@Controller('chats')
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Post()
  @ApiOperation({
    summary: 'Open a chat with a person',
    description:
      'Returns the chat that is already there if the two have one, so the ' +
      'client can call it every time it needs the id.',
  })
  @ZodResponse({ status: 201, type: ChatDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateChatDto) {
    return toChatDto(await this.chats.createPrivate(user, dto.userId));
  }

  @Get()
  @ApiOperation({
    summary: 'Chats of the current user',
    description:
      'Last written to first, with the last message and the unread count of ' +
      'each. archived=true returns the archive instead.',
  })
  @ZodResponse({ status: 200, type: ChatPageDto })
  async list(@CurrentUser() user: User, @Query() query: ChatListQueryDto) {
    const page = await this.chats.list(user.id, query);
    return { ...page, items: page.items.map(toChatViewDto) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'One chat, members only' })
  @ZodResponse({ status: 200, type: ChatViewDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return toChatViewDto(await this.chats.findById(id, user.id));
  }

  @Get(':id/participants')
  @ApiOperation({
    summary: 'Who is in the chat',
    description: 'A content chat keeps its list to itself and answers 403.',
  })
  @ZodResponse({ status: 200, type: [ChatParticipantDto] })
  async participants(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const found = await this.chats.participants(id, user.id);

    return found.map((participant) => ({
      user: toPublicUser(participant.user),
      canWrite: participant.canWrite,
      joinedAt: participant.joinedAt.toISOString(),
    }));
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'History of a chat',
    description:
      'Newest first, like the feed. Members only, except a content chat: ' +
      'those are the comments of a post and anybody signed in may read them.',
  })
  @ZodResponse({ status: 200, type: MessagePageDto })
  async messages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query() query: PageQueryDto,
  ) {
    const page = await this.chats.messages(id, user.id, query);
    return { ...page, items: page.items.map(toMessageDto) };
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Write into a chat',
    description:
      'An empty body with a postId is how a post is saved to Favourites.',
  })
  @ZodResponse({ status: 201, type: MessageDto })
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: CreateMessageDto,
  ) {
    return toMessageDto(await this.chats.send(id, user, dto));
  }

  @Delete(':id/messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a message, its author only',
    description:
      'How a saved post leaves Favourites, and how a note written there is ' +
      'taken back.',
  })
  removeMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @CurrentUser() user: User,
  ) {
    return this.chats.deleteMessage(id, messageId, user);
  }

  @Put(':id/read')
  @ApiOperation({
    summary: 'Move the read cursor to a message',
    description:
      'Answers with what is left unread, so the badge needs no call.',
  })
  @ZodResponse({ status: 200, type: UnreadDto })
  read(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: ReadChatDto,
  ) {
    return this.chats.markRead(id, user.id, dto.messageId);
  }

  @Put(':id/archive')
  @ApiOperation({
    summary: 'Archive a chat, or take it back out',
    description:
      'Touches only your own row: a conversation belongs to two people and ' +
      'one of them does not get to delete it for the other.',
  })
  @ZodResponse({ status: 200, type: ChatViewDto })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: ArchiveChatDto,
  ) {
    return toChatViewDto(await this.chats.archive(id, user.id, dto.archived));
  }

  @Put(':id/settings')
  @ApiOperation({
    summary: 'Close an event chat for writing',
    description: 'The author of the event only, and only an event chat.',
  })
  @ZodResponse({ status: 200, type: ChatDto })
  async settings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: ChatSettingsDto,
  ) {
    return toChatDto(
      await this.chats.setWriteRestricted(id, user, dto.writeRestricted),
    );
  }

  @Put(':id/participants/:userId')
  @ApiOperation({
    summary: 'Mute one participant, or give the voice back',
    description: 'The author of the event only, and never themselves.',
  })
  @ZodResponse({ status: 200, type: ChatParticipantDto })
  async setParticipantWrite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
    @Body() dto: ParticipantWriteDto,
  ) {
    const participant = await this.chats.setCanWrite(
      id,
      user,
      userId,
      dto.canWrite,
    );

    return {
      user: toPublicUser(participant.user),
      canWrite: participant.canWrite,
      joinedAt: participant.joinedAt.toISOString(),
    };
  }

  @Delete(':id/participants/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a participant from an event chat',
    description:
      'The chat leaves their list. The row stays, so a fresh response does ' +
      'not walk them back in.',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ) {
    return this.chats.removeParticipant(id, user, userId);
  }
}
