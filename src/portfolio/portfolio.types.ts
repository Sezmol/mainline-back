import type { User } from '../users/users.types';

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  links: string[];
  previewUrl?: string;
  author: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePortfolioItemInput {
  userId: string;
  title: string;
  description?: string;
  links: string[];
  previewUrl?: string;
}

export type UpdatePortfolioItemInput = Omit<CreatePortfolioItemInput, 'userId'>;
