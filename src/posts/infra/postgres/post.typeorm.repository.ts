import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostsRepository } from '../../posts.repository';
import type {
  CreatePostInput,
  FindPostsQuery,
  Post,
  UpdatePostInput,
} from '../../posts.types';
import { PostLikeEntity } from './post-like.entity';
import { PostEntity } from './post.entity';
import { toPost } from './post.mapper';

interface LikeStats {
  postId: string;
  likeCount: number;
  likedByViewer: boolean;
}

@Injectable()
export class PostTypeormRepository extends PostsRepository {
  constructor(
    @InjectRepository(PostEntity)
    private readonly posts: Repository<PostEntity>,
    @InjectRepository(PostLikeEntity)
    private readonly likes: Repository<PostLikeEntity>,
  ) {
    super();
  }

  async create(input: CreatePostInput) {
    const { id } = await this.posts.save(this.posts.create(input));
    return this.reload(id, input.authorId);
  }

  exists(id: string) {
    return this.posts.existsBy({ id });
  }

  async findById(id: string, viewerId: string): Promise<Post | null> {
    const found = await this.posts.findOne({
      where: { id },
      relations: { author: true },
    });

    if (!found) return null;

    await this.attachLikes([found], viewerId);
    return toPost(found);
  }

  async findMany({ type, direction, cursor, limit, viewerId }: FindPostsQuery) {
    const query = this.posts
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.author', 'author')
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .take(limit);

    if (type) query.andWhere('post.type = :type', { type });
    if (direction) query.andWhere('post.direction = :direction', { direction });

    if (cursor) {
      query.andWhere('(post.createdAt, post.id) < (:createdAt, :id)', cursor);
    }

    const found = await query.getMany();
    await this.attachLikes(found, viewerId);

    return found.map(toPost);
  }

  async update(id: string, input: UpdatePostInput, viewerId: string) {
    await this.posts.update(id, input);
    return this.reload(id, viewerId);
  }

  async delete(id: string) {
    await this.posts.delete(id);
  }

  async like(postId: string, userId: string) {
    await this.likes
      .createQueryBuilder()
      .insert()
      .values({ postId, userId })
      .orIgnore()
      .execute();
  }

  async unlike(postId: string, userId: string) {
    await this.likes.delete({ postId, userId });
  }

  private async attachLikes(posts: PostEntity[], viewerId: string) {
    if (posts.length === 0) return;

    const stats = await this.likes
      .createQueryBuilder('postLike')
      .select('postLike.postId', 'postId')
      .addSelect('count(*)::int', 'likeCount')
      .addSelect('bool_or(postLike.userId = :viewerId)', 'likedByViewer')
      .where('postLike.postId in (:...ids)', {
        ids: posts.map((post) => post.id),
      })
      .setParameter('viewerId', viewerId)
      .groupBy('postLike.postId')
      .getRawMany<LikeStats>();

    const byPost = new Map(stats.map((row) => [row.postId, row]));

    for (const post of posts) {
      const row = byPost.get(post.id);
      post.likeCount = row?.likeCount ?? 0;
      post.likedByViewer = row?.likedByViewer ?? false;
    }
  }

  private async reload(id: string, viewerId: string) {
    const post = await this.findById(id, viewerId);
    if (!post) throw new Error(`Post ${id} vanished right after a write`);
    return post;
  }
}
