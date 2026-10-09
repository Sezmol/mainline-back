import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import type { InteractionStatus } from '../../../common/domain/directory';
import { asUniqueViolation } from '../../../infra/database/unique-violation';
import { PostEntity } from '../../../posts/infra/postgres/post.entity';
import { InteractionsRepository } from '../../interactions.repository';
import {
  InteractionExistsError,
  type CreateInteractionInput,
} from '../../interactions.types';
import { InteractionEntity } from './interaction.entity';
import { toInteraction } from './interaction.mapper';

@Injectable()
export class InteractionTypeormRepository extends InteractionsRepository {
  constructor(
    @InjectRepository(InteractionEntity)
    private readonly interactions: Repository<InteractionEntity>,
  ) {
    super();
  }

  async create(input: CreateInteractionInput, manager?: EntityManager) {
    const repository = this.repository(manager);

    try {
      const { id } = await repository.save(repository.create(input));
      return await this.reload(id, manager);
    } catch (error) {
      if (asUniqueViolation(error)) throw new InteractionExistsError();
      throw error;
    }
  }

  async findByPost(postId: string) {
    const found = await this.interactions.find({
      where: { postId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return found.map(toInteraction);
  }

  async findByPostAndUser(postId: string, userId: string) {
    const found = await this.interactions.findOne({
      where: { postId, userId },
      relations: { user: true },
    });

    return found ? toInteraction(found) : null;
  }

  async setStatus(
    id: string,
    status: InteractionStatus,
    manager?: EntityManager,
  ) {
    await this.repository(manager).update(id, { status });
    return this.reload(id, manager);
  }

  async countAcceptedForUpdate(postId: string, manager: EntityManager) {
    await manager
      .getRepository(PostEntity)
      .createQueryBuilder('post')
      .setLock('pessimistic_write')
      .where('post.id = :postId', { postId })
      .getOne();

    return this.repository(manager).countBy({ postId, status: 'accepted' });
  }

  private repository(manager?: EntityManager) {
    return manager
      ? manager.getRepository(InteractionEntity)
      : this.interactions;
  }

  private async reload(id: string, manager?: EntityManager) {
    const found = await this.repository(manager).findOne({
      where: { id },
      relations: { user: true },
    });

    if (!found)
      throw new Error(`Interaction ${id} vanished right after a write`);
    return toInteraction(found);
  }
}
