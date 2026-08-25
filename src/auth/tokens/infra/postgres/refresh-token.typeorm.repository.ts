import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository, type EntityManager } from 'typeorm';
import { RefreshTokenRepository } from '../../refresh-token.repository';
import type {
  CreateRefreshTokenInput,
  RefreshTokenRecord,
} from '../../refresh-token.types';
import { RefreshTokenEntity } from './refresh-token.entity';

const toRecord = (entity: RefreshTokenEntity) => ({
  id: entity.id,
  userId: entity.userId,
  tokenHash: entity.tokenHash,
  expiresAt: entity.expiresAt,
});

@Injectable()
export class RefreshTokenTypeormRepository extends RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly tokens: Repository<RefreshTokenEntity>,
  ) {
    super();
  }

  private repository(manager?: EntityManager) {
    return manager ? manager.getRepository(RefreshTokenEntity) : this.tokens;
  }

  async create(input: CreateRefreshTokenInput, manager?: EntityManager) {
    const repository = this.repository(manager);
    return toRecord(await repository.save(repository.create(input)));
  }

  async findByHash(
    tokenHash: string,
    manager?: EntityManager,
  ): Promise<RefreshTokenRecord | null> {
    const found = await this.repository(manager).findOne({
      where: { tokenHash },
    });
    return found ? toRecord(found) : null;
  }

  async deleteByHash(tokenHash: string, manager?: EntityManager) {
    await this.repository(manager).delete({ tokenHash });
  }

  async deleteExpiredForUser(userId: string, manager?: EntityManager) {
    await this.repository(manager).delete({
      userId,
      expiresAt: LessThanOrEqual(new Date()),
    });
  }

  async deleteAllForUser(userId: string) {
    await this.tokens.delete({ userId });
  }
}
