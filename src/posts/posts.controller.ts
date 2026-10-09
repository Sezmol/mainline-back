import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PageQueryDto } from '../common/pagination/page-query.dto';
import { toPublicUser } from '../users/dto/user.dto';
import type { User } from '../users/users.types';
import {
  ChatDto,
  MessageDto,
  toChatDto,
  toMessageDto,
} from '../chats/dto/chat.dto';
import { AssignDto, SetStatusDto } from './dto/task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { LikePageDto, PostDto, PostPageDto } from './dto/post.dto';
import { PostsQueryDto } from './dto/posts-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';
import type { Post as DomainPost } from './posts.types';

const toPostDto = (post: DomainPost) => {
  const common = {
    id: post.id,
    direction: post.direction,
    title: post.title,
    body: post.body,
    author: toPublicUser(post.author),
    company: post.company,
    likeCount: post.likeCount,
    likedByMe: post.likedByMe,
    savedByMe: post.savedByMe,
    commentCount: post.commentCount,
    acceptedCount: post.acceptedCount,
    myInteraction: post.myInteraction,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };

  switch (post.type) {
    case 'vacancy':
      return {
        ...common,
        type: post.type,
        location: post.location,
        salaryMin: post.salaryMin,
        salaryMax: post.salaryMax,
        workFormat: post.workFormat,
      };

    case 'event':
      return {
        ...common,
        type: post.type,
        location: post.location,
        isPrivate: post.isPrivate,
        participantLimit: post.participantLimit,
      };

    case 'task':
      return {
        ...common,
        type: post.type,
        projectId: post.projectId,
        project: post.project,
        deadline: post.deadline ? post.deadline.toISOString() : null,
        status: post.status,
        isPrivate: post.isPrivate,
        attachments: post.attachments,
        assignees: post.assignees.map(toPublicUser),
      };

    case 'content':
      return { ...common, type: post.type };
  }
};

@ApiTags('posts')
@ApiCookieAuth('access_token')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @ApiOperation({
    summary: 'A page of the feed, newest first',
    description:
      'Pass the nextCursor from the previous page to get the next one. ' +
      'Filters and cursor combine freely.',
  })
  @ZodResponse({ status: 200, type: PostPageDto })
  async list(@Query() query: PostsQueryDto, @CurrentUser() user: User) {
    const page = await this.posts.findPage(query, user.id);
    return { items: page.items.map(toPostDto), nextCursor: page.nextCursor };
  }

  @Get(':id')
  @ApiOperation({ summary: 'A single post' })
  @ZodResponse({ status: 200, type: PostDto })
  async byId(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return toPostDto(await this.posts.findById(id, user.id));
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Publish a post' })
  @ZodResponse({ status: 201, type: PostDto })
  async create(@CurrentUser() user: User, @Body() dto: CreatePostDto) {
    return toPostDto(await this.posts.create(user.id, dto));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit a post, author only' })
  @ZodResponse({ status: 200, type: PostDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdatePostDto,
  ) {
    return toPostDto(await this.posts.update(id, user.id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a post, author only' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.posts.remove(id, user.id);
  }

  @Post(':id/like')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Like a post',
    description:
      'Liking twice is not an error, the second one changes nothing.',
  })
  like(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.posts.like(id, user.id);
  }

  @Delete(':id/like')
  @HttpCode(204)
  @ApiOperation({ summary: 'Take a like back' })
  unlike(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.posts.unlike(id, user.id);
  }

  @Post(':id/save')
  @ApiOperation({
    summary: 'Save a post to Favourites',
    description:
      'Favourites is a chat, so saving writes a message holding the post. ' +
      'Saving twice changes nothing and answers with the message already ' +
      'there.',
  })
  @ZodResponse({ status: 201, type: MessageDto })
  async save(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return toMessageDto(await this.posts.save(id, user));
  }

  @Delete(':id/save')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Take a post out of Favourites',
    description: 'Deletes the message that holds it.',
  })
  unsave(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.posts.unsave(id, user.id);
  }

  @Get(':id/likes')
  @ApiOperation({
    summary: 'Who liked a post, newest first',
    description: 'Paged: a popular post is not a list you send in one piece.',
  })
  @ZodResponse({ status: 200, type: LikePageDto })
  likes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query() query: PageQueryDto,
  ) {
    return this.posts.findLikePage(id, user.id, query);
  }

  @Get(':id/chat')
  @ApiOperation({
    summary: 'The chat of an event or a content post',
    description:
      '404 while a content post has no comments yet. A vacancy is not here: ' +
      'it has one chat per response.',
  })
  @ZodResponse({ status: 200, type: ChatDto })
  async chat(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return toChatDto(await this.posts.chatOf(id, user.id));
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Move a task to another column',
    description:
      'What dragging a card across the board sends. Assignees and the author ' +
      'may move their own task whatever the project allows the rest.',
  })
  @ZodResponse({ status: 200, type: PostDto })
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: SetStatusDto,
  ) {
    return toPostDto(await this.posts.setStatus(id, user, dto.status));
  }

  @Post(':id/assignees')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Put somebody on a task',
    description:
      'Only inside a project, and only for people already on its team. ' +
      'A task with an assignee becomes private.',
  })
  @ZodResponse({ status: 201, type: PostDto })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: AssignDto,
  ) {
    return toPostDto(await this.posts.assign(id, user, dto.userId));
  }

  @Delete(':id/assignees/:userId')
  @ApiOperation({ summary: 'Take somebody off a task, or step off yourself' })
  @ZodResponse({ status: 200, type: PostDto })
  async unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ) {
    return toPostDto(await this.posts.unassign(id, user, userId));
  }

  @Post(':id/comments')
  @ApiOperation({
    summary: 'Comment on a content post',
    description:
      'The way into the content chat from the feed, where the client has the ' +
      'post but not the chat. The first comment is what creates the chat.',
  })
  @ZodResponse({ status: 201, type: MessageDto })
  async comment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCommentDto,
  ) {
    return toMessageDto(await this.posts.comment(id, user, dto));
  }
}
