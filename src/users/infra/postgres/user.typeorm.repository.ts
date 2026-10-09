import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { asUniqueViolation } from '../../../infra/database/unique-violation';
import { UsersRepository } from '../../users.repository';
import {
  EmailTakenError,
  NicknameTakenError,
  type CreateUserInput,
  type UpdateUserInput,
} from '../../users.types';
import { UserEntity } from './user.entity';
import { toUser } from './user.mapper';

@Injectable()
export class UserTypeormRepository extends UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {
    super();
  }

  async create(input: CreateUserInput, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(UserEntity) : this.users;

    try {
      return toUser(await repository.save(repository.create(input)));
    } catch (error) {
      const violation = asUniqueViolation(error);
      if (violation) {
        const target = `${violation.constraint ?? ''} ${violation.detail ?? ''}`;
        throw target.includes('email')
          ? new EmailTakenError()
          : new NicknameTakenError();
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUserInput) {
    try {
      await this.users.update(id, {
        ...input,
        description: input.description || null,
        workplace: input.workplace || null,
      });
    } catch (error) {
      if (asUniqueViolation(error)) throw new NicknameTakenError();
      throw error;
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error(`User ${id} vanished right after a write`);
    return updated;
  }

  async findById(id: string) {
    const found = await this.users.findOne({ where: { id } });
    return found ? toUser(found) : null;
  }

  async findByNickname(nickname: string) {
    const found = await this.users.findOne({
      where: { nickname: nickname.toLowerCase() },
    });
    return found ? toUser(found) : null;
  }

  async findWithPasswordByNickname(nickname: string) {
    const found = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.nickname = :nickname', { nickname: nickname.toLowerCase() })
      .getOne();

    if (!found) return null;
    return { user: toUser(found), passwordHash: found.passwordHash };
  }

  existsByNickname(nickname: string) {
    return this.users.existsBy({ nickname: nickname.toLowerCase() });
  }

  existsByEmail(email: string) {
    return this.users.existsBy({ email: email.toLowerCase() });
  }
}
