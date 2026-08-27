import type { PostType, Speciality } from '../common/domain/directory';
import type { User } from '../users/users.types';

export interface Post {
  id: string;
  type: PostType;
  direction: Speciality;
  title: string;
  body: string;
  author: User;
  likeCount: number;
  likedByMe: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostInput {
  authorId: string;
  direction: Speciality;
  title: string;
  body: string;
}

export interface UpdatePostInput {
  direction?: Speciality;
  title?: string;
  body?: string;
}

export interface PostCursor {
  createdAt: Date;
  id: string;
}

export interface FindPostsQuery {
  viewerId: string;
  type?: PostType;
  direction?: Speciality;
  cursor?: PostCursor;
  limit: number;
}
