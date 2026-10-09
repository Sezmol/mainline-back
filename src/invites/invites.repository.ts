import type { EntityManager } from 'typeorm';
import type { InviteStatus } from '../common/domain/directory';
import type {
  CreateInviteInput,
  FindInvitesQuery,
  Invite,
} from './invites.types';

export abstract class InvitesRepository {
  abstract create(
    input: CreateInviteInput,
    manager: EntityManager,
  ): Promise<Invite>;
  abstract findById(
    id: string,
    manager?: EntityManager,
  ): Promise<Invite | null>;
  abstract findMany(query: FindInvitesQuery): Promise<Invite[]>;
  abstract answer(
    id: string,
    status: Extract<InviteStatus, 'accepted' | 'declined'>,
    manager: EntityManager,
  ): Promise<Invite | null>;
  abstract deletePending(id: string): Promise<boolean>;
}
