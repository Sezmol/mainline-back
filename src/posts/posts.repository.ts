import type {
  CreatePostInput,
  FindPostsQuery,
  Post,
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
}
