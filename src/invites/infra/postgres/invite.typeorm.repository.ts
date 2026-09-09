import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { asUniqueViolation } from '../../../infra/database/unique-violation';
import { InvitesRepository } from '../../invites.repository';
import {
  InviteExistsError,
  type CreateInviteInput,
  type FindInvitesQuery,
} from '../../invites.types';
import { InviteEntity } from './invite.entity';
import { toInvite } from './invite.mapper';

const INVITE_RELATIONS = {
  inviter: true,
  invitee: true,
  company: true,
  department: true,
  team: true,
} as const;

@Injectable()
export class InviteTypeormRepository extends InvitesRepository {
  constructor(
    @InjectRepository(InviteEntity)
    private readonly invites: Repository<InviteEntity>,
  ) {
    super();
  }

  async create(input: CreateInviteInput, manager: EntityManager) {
    const repo = manager.getRepository(InviteEntity);

    let id: string;
    try {
      ({ id } = await repo.save(repo.create(input)));
    } catch (error) {
      if (asUniqueViolation(error)) throw new InviteExistsError();
      throw error;
    }

    const saved = await repo.findOne({
      where: { id },
      relations: INVITE_RELATIONS,
    });

    if (!saved) throw new Error(`Invite ${id} vanished right after a write`);
    return toInvite(saved);
  }

  async findById(id: string, manager?: EntityManager) {
    const found = await this.repo(manager).findOne({
      where: { id },
      relations: INVITE_RELATIONS,
    });

    return found ? toInvite(found) : null;
  }

  async findMany({ userId, direction, status }: FindInvitesQuery) {
    const found = await this.invites.find({
      where: {
        ...(direction === 'incoming'
          ? { inviteeId: userId }
          : { inviterId: userId }),
        ...(status ? { status } : {}),
      },
      relations: INVITE_RELATIONS,
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return found.map(toInvite);
  }

  async setStatus(
    id: string,
    status: 'accepted' | 'declined',
    manager: EntityManager,
  ) {
    await manager
      .getRepository(InviteEntity)
      .update(id, { status, decidedAt: new Date() });

    const updated = await this.findById(id, manager);
    if (!updated) throw new Error(`Invite ${id} vanished right after a write`);
    return updated;
  }

  async delete(id: string) {
    await this.invites.delete(id);
  }

  private repo(manager?: EntityManager) {
    return manager ? manager.getRepository(InviteEntity) : this.invites;
  }
}
