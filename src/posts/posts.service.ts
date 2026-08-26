import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreatePostDto } from './dto/create-post.dto';
import type { PostsQueryDto } from './dto/posts-query.dto';
import type { UpdatePostDto } from './dto/update-post.dto';
import { decodeCursor, encodeCursor } from './posts.cursor';
import { PostsRepository } from './posts.repository';

@Injectable()
export class PostsService {
  constructor(private readonly posts: PostsRepository) {}

  async findPage(
    { type, direction, cursor, limit }: PostsQueryDto,
    viewerId: string,
  ) {
    const decoded = cursor ? decodeCursor(cursor) : null;
    if (cursor && !decoded) throw new BadRequestException('Invalid cursor');

    const found = await this.posts.findMany({
      viewerId,
      ...(type ? { type } : {}),
      ...(direction ? { direction } : {}),
      ...(decoded ? { cursor: decoded } : {}),
      limit: limit + 1,
    });

    const items = found.slice(0, limit);
    const last = items.at(-1);

    return {
      items,
      nextCursor: found.length > limit && last ? encodeCursor(last) : null,
    };
  }

  async findById(id: string, viewerId: string) {
    const post = await this.posts.findById(id, viewerId);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  create(authorId: string, dto: CreatePostDto) {
    return this.posts.create({ authorId, ...dto });
  }

  async update(id: string, authorId: string, dto: UpdatePostDto) {
    await this.requireOwned(id, authorId);
    return this.posts.update(id, dto, authorId);
  }

  async remove(id: string, authorId: string) {
    await this.requireOwned(id, authorId);
    await this.posts.delete(id);
  }

  async like(id: string, userId: string) {
    await this.requireExists(id);
    await this.posts.like(id, userId);
  }

  async unlike(id: string, userId: string) {
    await this.requireExists(id);
    await this.posts.unlike(id, userId);
  }

  private async requireExists(id: string) {
    if (!(await this.posts.exists(id))) {
      throw new NotFoundException('Post not found');
    }
  }

  private async requireOwned(id: string, authorId: string) {
    const post = await this.findById(id, authorId);

    if (post.author.id !== authorId) {
      throw new ForbiddenException('You can only change your own posts');
    }

    return post;
  }
}
