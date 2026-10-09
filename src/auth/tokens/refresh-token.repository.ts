import type { EntityManager } from 'typeorm';
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
} from './refresh-token.types';

export abstract class RefreshTokenRepository {
  abstract create(
    input: CreateRefreshTokenInput,
    manager?: EntityManager,
  ): Promise<RefreshTokenRecord>;

  abstract consume(
    tokenHash: string,
    manager: EntityManager,
  ): Promise<string | null>;

  abstract deleteByHash(
    tokenHash: string,
    manager?: EntityManager,
  ): Promise<void>;

  abstract deleteExpiredForUser(
    userId: string,
    manager?: EntityManager,
  ): Promise<void>;

  abstract deleteAllForUser(userId: string): Promise<void>;
}
