import type { EntityManager } from 'typeorm';
import type {
  CreatePostInput,
  FindLikesQuery,
  FindPostsQuery,
  Post,
  PostLike,
  UpdatePostInput,
} from './posts.types';

export abstract class PostsRepository {
  abstract create(input: CreatePostInput): Promise<Post>;
  abstract exists(id: string): Promise<boolean>;
  abstract findById(id: string, viewerId: string): Promise<Post | null>;
  abstract findMany(query: FindPostsQuery): Promise<Post[]>;
  abstract update(
    id: string,
    input: UpdatePostInput,
    viewerId: string,
  ): Promise<Post>;
  abstract delete(id: string): Promise<void>;
  abstract like(postId: string, userId: string): Promise<void>;
  abstract unlike(postId: string, userId: string): Promise<void>;
  abstract findLikes(query: FindLikesQuery): Promise<PostLike[]>;

  abstract setAssignees(postId: string, userIds: string[]): Promise<void>;
  abstract addAssignee(
    postId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<void>;
  abstract removeAssignee(postId: string, userId: string): Promise<void>;
  abstract countAssignees(postId: string): Promise<number>;
  abstract setPrivate(
    postId: string,
    isPrivate: boolean,
    manager?: EntityManager,
  ): Promise<void>;
  abstract attachToProject(
    postId: string,
    projectId: string,
    status: string,
    manager?: EntityManager,
  ): Promise<void>;
  abstract setStatus(postId: string, status: string): Promise<void>;
}
