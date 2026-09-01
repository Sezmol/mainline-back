import type {
  InteractionKind,
  InteractionStatus,
  PostType,
  Speciality,
  WorkFormat,
} from '../common/domain/directory';
import type { Cursor } from '../common/pagination/cursor';
import type { User } from '../users/users.types';

interface CommonFields {
  direction: Speciality;
  title: string;
  body: string;
}

export interface ContentDetails extends CommonFields {
  type: 'content';
}

export interface VacancyDetails extends CommonFields {
  type: 'vacancy';
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  workFormat: WorkFormat;
}

export interface EventDetails extends CommonFields {
  type: 'event';
  location: string | null;
  isPrivate: boolean;
  participantLimit: number | null;
}

export interface TaskDetails extends CommonFields {
  type: 'task';
  projectId: string | null;
  deadline: Date | null;
  status: string;
  isPrivate: boolean;
  attachments: string[];
}

export type PostDetails =
  ContentDetails | VacancyDetails | EventDetails | TaskDetails;

export interface TaskProject {
  id: string;
  name: string;
}

export type TaskView = TaskDetails & {
  assignees: User[];
  project: TaskProject | null;
};

export type PostView =
  ContentDetails | VacancyDetails | EventDetails | TaskView;

export interface ViewerInteraction {
  kind: InteractionKind;
  status: InteractionStatus;
}

export interface PostCompany {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

interface PostMeta {
  id: string;
  author: User;
  company: PostCompany | null;
  likeCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  commentCount: number;
  acceptedCount: number;
  myInteraction: ViewerInteraction | null;
  createdAt: Date;
  updatedAt: Date;
}

export type Post = PostView & PostMeta;

export type CreatePostInput = PostDetails & {
  authorId: string;
  companyId: string | null;
};

export type UpdatePostInput = PostDetails & { companyId: string | null };

export const TASK_SCOPES = ['none', 'mine'] as const;

export type TaskScope = (typeof TASK_SCOPES)[number];

export interface FindPostsQuery {
  viewerId: string;
  type?: PostType;
  direction?: Speciality;
  companyId?: string;
  projectId?: string;
  scope?: TaskScope;
  cursor?: Cursor;
  limit: number;
}

export interface PostLike {
  user: User;
  createdAt: Date;
}

export interface FindLikesQuery {
  postId: string;
  cursor?: Cursor;
  limit: number;
}
