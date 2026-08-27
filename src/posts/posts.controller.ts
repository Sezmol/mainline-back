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
import { toPublicUser } from '../users/dto/user.dto';
import type { User } from '../users/users.types';
import { CreatePostDto } from './dto/create-post.dto';
import { PostDto, PostPageDto } from './dto/post.dto';
import { PostsQueryDto } from './dto/posts-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';
import type { Post as DomainPost } from './posts.types';

const toPostDto = (post: DomainPost): PostDto => ({
  id: post.id,
  type: post.type,
  direction: post.direction,
  title: post.title,
  body: post.body,
  author: toPublicUser(post.author),
  likeCount: post.likeCount,
  likedByMe: post.likedByMe,
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
});

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
}
