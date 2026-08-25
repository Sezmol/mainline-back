import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { AppException } from '../common/errors/app.exception';
import type {
  AvailabilityQueryDto,
  AvailabilityResponseDto,
} from './dto/availability.dto';
import { UsersRepository } from './users.repository';
import {
  EmailTakenError,
  NicknameTakenError,
  type CreateUserInput,
} from './users.types';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async checkAvailability(query: AvailabilityQueryDto) {
    const result: AvailabilityResponseDto = {};

    if (query.nickname !== undefined) {
      result.nickname = !(await this.users.existsByNickname(query.nickname));
    }

    if (query.email !== undefined) {
      result.email = !(await this.users.existsByEmail(query.email));
    }

    return result;
  }

  async create(input: CreateUserInput, manager?: EntityManager) {
    try {
      return await this.users.create(input, manager);
    } catch (error) {
      if (error instanceof NicknameTakenError) {
        throw AppException.conflict(error.message, {
          nickname: [error.message],
        });
      }
      if (error instanceof EmailTakenError) {
        throw AppException.conflict(error.message, { email: [error.message] });
      }
      throw error;
    }
  }

  findById(id: string) {
    return this.users.findById(id);
  }

  findWithPasswordByNickname(nickname: string) {
    return this.users.findWithPasswordByNickname(nickname);
  }
}
