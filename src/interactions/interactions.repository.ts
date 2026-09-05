import type { EntityManager } from 'typeorm';
import type { InteractionStatus } from '../common/domain/directory';
import type { CreateInteractionInput, Interaction } from './interactions.types';

export abstract class InteractionsRepository {
  abstract create(
    input: CreateInteractionInput,
    manager?: EntityManager,
  ): Promise<Interaction>;
  abstract findByPost(postId: string): Promise<Interaction[]>;
  abstract findByPostAndUser(
    postId: string,
    userId: string,
  ): Promise<Interaction | null>;
  abstract setStatus(
    id: string,
    status: InteractionStatus,
    manager?: EntityManager,
  ): Promise<Interaction>;
  abstract countAcceptedForUpdate(
    postId: string,
    manager: EntityManager,
  ): Promise<number>;
}
