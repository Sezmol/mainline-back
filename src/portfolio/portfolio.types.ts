import type { User } from '../users/users.types';

export interface Project {
  id: string;
  title: string;
  description?: string;
  links: string[];
  previewUrl?: string;
  author: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  userId: string;
  title: string;
  description?: string;
  links: string[];
  previewUrl?: string;
}

export type UpdateProjectInput = Omit<CreateProjectInput, 'userId'>;
