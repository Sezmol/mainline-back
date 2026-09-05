import type {
  InteractionKind,
  InteractionStatus,
} from '../common/domain/directory';
import type { User } from '../users/users.types';

export interface Interaction {
  id: string;
  postId: string;
  kind: InteractionKind;
  status: InteractionStatus;
  user: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInteractionInput {
  postId: string;
  userId: string;
  kind: InteractionKind;
  status: InteractionStatus;
}

export class InteractionExistsError extends Error {
  constructor() {
    super('This person already has an interaction with the post');
    this.name = 'InteractionExistsError';
  }
}
