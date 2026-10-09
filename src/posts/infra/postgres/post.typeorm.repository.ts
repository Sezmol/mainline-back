import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type EntityManager } from 'typeorm';
import { ChatEntity } from '../../../chats/infra/postgres/chat.entity';
import { MessageEntity } from '../../../chats/infra/postgres/message.entity';
import { InteractionEntity } from '../../../interactions/infra/postgres/interaction.entity';
import { PostsRepository } from '../../posts.repository';
import type {
  CreatePostInput,
  FindLikesQuery,
  FindPostsQuery,
  PostDetails,
  UpdatePostInput,
} from '../../posts.types';
import { PostAssigneeEntity } from './post-assignee.entity';
import { PostLikeEntity } from './post-like.entity';
import { PostEntity } from './post.entity';
import { toUser } from '../../../users/infra/postgres/user.mapper';
import { toPost } from './post.mapper';

type PostColumns = Pick<
  PostEntity,
  | 'type'
  | 'direction'
  | 'title'
  | 'body'
  | 'location'
  | 'salaryMin'
  | 'salaryMax'
  | 'workFormat'
  | 'isPrivate'
  | 'participantLimit'
  | 'projectId'
  | 'deadline'
  | 'status'
  | 'attachments'
>;

const toColumns = (details: PostDetails): PostColumns => {
  const common = {
    type: details.type,
    direction: details.direction,
    title: details.title,
    body: details.body,
    location: null,
    salaryMin: null,
    salaryMax: null,
    workFormat: null,
    isPrivate: null,
    participantLimit: null,
    projectId: null,
    deadline: null,
    status: null,
    attachments: [],
  };

  switch (details.type) {
    case 'vacancy':
      return {
        ...common,
        location: details.location,
        salaryMin: details.salaryMin,
        salaryMax: details.salaryMax,
        workFormat: details.workFormat,
      };

    case 'event':
      return {
        ...common,
        location: details.location,
        isPrivate: details.isPrivate,
        participantLimit: details.participantLimit,
      };

    case 'task':
      return {
        ...common,
        isPrivate: details.isPrivate,
        projectId: details.projectId,
        deadline: details.deadline,
        status: details.status,
        attachments: details.attachments,
      };

    case 'content':
      return common;
  }
};

const ownTask = (alias: string) =>
  `(${alias}."authorId" = :viewerId OR EXISTS (
      SELECT 1 FROM post_assignees pa
       WHERE pa."postId" = ${alias}."id" AND pa."userId" = :viewerId))`;

interface LikeStats {
  postId: string;
  likeCount: number;
  likedByViewer: boolean;
}

interface AcceptedStats {
  postId: string;
  acceptedCount: number;
}

interface CommentStats {
  postId: string;
  commentCount: number;
}

interface ProjectNameRow {
  postId: string;
  projectName: string;
}

@Injectable()
export class PostTypeormRepository extends PostsRepository {
  constructor(
    @InjectRepository(PostEntity)
    private readonly posts: Repository<PostEntity>,
    @InjectRepository(PostLikeEntity)
    private readonly likes: Repository<PostLikeEntity>,
    @InjectRepository(InteractionEntity)
    private readonly interactions: Repository<InteractionEntity>,
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
    @InjectRepository(PostAssigneeEntity)
    private readonly assignees: Repository<PostAssigneeEntity>,
  ) {
    super();
  }

  async create({ authorId, companyId, ...details }: CreatePostInput) {
    const columns = { authorId, companyId, ...toColumns(details) };
    const { id } = await this.posts.save(this.posts.create(columns));
    return this.reload(id, authorId);
  }

  exists(id: string) {
    return this.posts.existsBy({ id });
  }

  async findById(id: string, viewerId: string) {
    const found = await this.posts.findOne({
      where: { id },
      relations: { author: true, company: true },
    });

    if (!found) return null;

    await this.attachExtras([found], viewerId);
    return toPost(found);
  }

  async findMany({
    type,
    direction,
    companyId,
    projectId,
    scope,
    cursor,
    limit,
    viewerId,
  }: FindPostsQuery) {
    const query = this.posts
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.company', 'company')
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .limit(limit);

    if (type) query.andWhere('post.type = :type', { type });
    if (direction) query.andWhere('post.direction = :direction', { direction });
    if (companyId) query.andWhere('post.companyId = :companyId', { companyId });

    if (projectId) {
      query.andWhere('post.projectId = :projectId', { projectId });
    } else if (scope) {
      query
        .andWhere(`post.type = 'task'`)
        .andWhere(ownTask('post'), { viewerId });

      if (scope === 'none') query.andWhere('post.projectId IS NULL');
    } else {
      query.andWhere(`(post.type <> 'task' OR post."isPrivate" = false)`);
    }

    if (cursor) {
      query.andWhere('(post.createdAt, post.id) < (:createdAt, :id)', cursor);
    }

    const found = await query.getMany();
    await this.attachExtras(found, viewerId);

    return found.map(toPost);
  }

  async update(
    id: string,
    { companyId, ...details }: UpdatePostInput,
    viewerId: string,
  ) {
    await this.posts.update(id, { companyId, ...toColumns(details) });
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

  async setAssignees(postId: string, userIds: string[]) {
    await this.assignees.manager.transaction(async (manager) => {
      const repo = manager.getRepository(PostAssigneeEntity);
      await repo.delete({ postId });

      if (userIds.length > 0) {
        await repo.insert(userIds.map((userId) => ({ postId, userId })));
      }
    });
  }

  async addAssignee(postId: string, userId: string, manager?: EntityManager) {
    await (manager ? manager.getRepository(PostAssigneeEntity) : this.assignees)
      .createQueryBuilder()
      .insert()
      .values({ postId, userId })
      .orIgnore()
      .execute();
  }

  async removeAssignee(postId: string, userId: string) {
    await this.assignees.delete({ postId, userId });
  }

  countAssignees(postId: string) {
    return this.assignees.countBy({ postId });
  }

  async setPrivate(
    postId: string,
    isPrivate: boolean,
    manager?: EntityManager,
  ) {
    await this.postRepo(manager).update(postId, { isPrivate });
  }

  async attachToProject(
    postId: string,
    projectId: string,
    status: string,
    manager?: EntityManager,
  ) {
    await this.postRepo(manager).update(postId, { projectId, status });
  }

  private postRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(PostEntity) : this.posts;
  }

  async setStatus(postId: string, status: string) {
    await this.posts.update(postId, { status });
  }

  async findLikes({ postId, cursor, limit }: FindLikesQuery) {
    const query = this.likes
      .createQueryBuilder('postLike')
      .innerJoinAndSelect('postLike.user', 'user')
      .where('postLike.postId = :postId', { postId })
      .orderBy('postLike.createdAt', 'DESC')
      .addOrderBy('postLike.userId', 'DESC')
      .limit(limit);

    if (cursor) {
      query.andWhere(
        '(postLike.createdAt, postLike.userId) < (:createdAt, :id)',
        cursor,
      );
    }

    const found = await query.getMany();

    return found.map((like) => ({
      user: toUser(like.user),
      createdAt: like.createdAt,
    }));
  }

  private async attachExtras(posts: PostEntity[], viewerId: string) {
    await this.attachLikes(posts, viewerId);
    await this.attachSaves(posts, viewerId);
    await this.attachComments(posts);
    await this.attachInteractions(posts, viewerId);
    await this.attachAssignees(posts);
    await this.attachProjects(posts, viewerId);
  }

  private async attachAssignees(posts: PostEntity[]) {
    const tasks = posts.filter((post) => post.type === 'task');
    if (tasks.length === 0) return;

    const rows = await this.assignees.find({
      where: { postId: In(tasks.map((post) => post.id)) },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    const byPost = rows.reduce((map, row) => {
      const users = map.get(row.postId) ?? [];
      users.push(row.user);
      return map.set(row.postId, users);
    }, new Map<string, PostAssigneeEntity['user'][]>());

    for (const task of tasks) {
      task.assignedUsers = byPost.get(task.id) ?? [];
    }
  }

  private async attachProjects(posts: PostEntity[], viewerId: string) {
    const tasks = posts.filter(
      (post) => post.type === 'task' && post.projectId !== null,
    );
    if (tasks.length === 0) return;

    const rows = await this.posts.query<ProjectNameRow[]>(
      `SELECT p."id" AS "postId", pr."name" AS "projectName"
         FROM posts p
         JOIN projects pr ON pr."id" = p."projectId"
         JOIN team_members tm
           ON tm."teamId" = pr."teamId" AND tm."userId" = $2::uuid
        WHERE p."id" = ANY($1::uuid[])`,
      [tasks.map((post) => post.id), viewerId],
    );

    const byPost = new Map(rows.map((row) => [row.postId, row.projectName]));

    for (const task of tasks) {
      task.projectName = byPost.get(task.id) ?? null;
    }
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

  private async attachSaves(posts: PostEntity[], viewerId: string) {
    if (posts.length === 0) return;

    const rows = await this.messages
      .createQueryBuilder('message')
      .select('message.postId', 'postId')
      .innerJoin(ChatEntity, 'chat', 'chat.id = message.chatId')
      .where('chat.type = :favorites', { favorites: 'favorites' })
      .andWhere('chat.ownerId = :viewerId', { viewerId })
      .andWhere('message.postId in (:...ids)', {
        ids: posts.map((post) => post.id),
      })
      .groupBy('message.postId')
      .getRawMany<{ postId: string }>();

    const saved = new Set(rows.map((row) => row.postId));

    for (const post of posts) {
      post.savedByViewer = saved.has(post.id);
    }
  }

  private async attachComments(posts: PostEntity[]) {
    const content = posts.filter((post) => post.type === 'content');
    if (content.length === 0) return;

    const rows = await this.messages
      .createQueryBuilder('message')
      .select('chat.postId', 'postId')
      .addSelect('count(*)::int', 'commentCount')
      .innerJoin(ChatEntity, 'chat', 'chat.id = message.chatId')
      .where('chat.type = :content', { content: 'content' })
      .andWhere('chat.postId in (:...ids)', {
        ids: content.map((post) => post.id),
      })
      .groupBy('chat.postId')
      .getRawMany<CommentStats>();

    const byPost = new Map(rows.map((row) => [row.postId, row.commentCount]));

    for (const post of content) {
      post.commentCount = byPost.get(post.id) ?? 0;
    }
  }

  private async attachInteractions(posts: PostEntity[], viewerId: string) {
    const open = posts.filter((post) => post.type !== 'content');
    if (open.length === 0) return;

    const ids = open.map((post) => post.id);

    const [taken, mine] = await Promise.all([
      this.interactions
        .createQueryBuilder('interaction')
        .select('interaction.postId', 'postId')
        .addSelect('count(*)::int', 'acceptedCount')
        .where('interaction.postId in (:...ids)', { ids })
        .andWhere("interaction.status = 'accepted'")
        .groupBy('interaction.postId')
        .getRawMany<AcceptedStats>(),

      this.interactions.find({
        where: { postId: In(ids), userId: viewerId },
        select: { postId: true, kind: true, status: true },
      }),
    ]);

    const acceptedByPost = new Map(taken.map((row) => [row.postId, row]));
    const mineByPost = new Map(mine.map((row) => [row.postId, row]));

    for (const post of open) {
      const own = mineByPost.get(post.id);
      post.acceptedCount = acceptedByPost.get(post.id)?.acceptedCount ?? 0;
      post.viewerInteraction = own
        ? { kind: own.kind, status: own.status }
        : null;
    }
  }

  private async reload(id: string, viewerId: string) {
    const post = await this.findById(id, viewerId);
    if (!post) throw new Error(`Post ${id} vanished right after a write`);
    return post;
  }
}
