import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { roleForSpeciality } from '../common/domain/directory';
import { AppException } from '../common/errors/app.exception';
import type {
  AvailabilityQueryDto,
  AvailabilityResponseDto,
} from './dto/availability.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
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
      throw this.asHttpError(error);
    }
  }

  async update(id: string, viewerId: string, dto: UpdateUserDto) {
    if (id !== viewerId) {
      throw new ForbiddenException('You can only edit your own profile');
    }

    try {
      return await this.users.update(id, {
        ...dto,
        role: roleForSpeciality(dto.speciality),
      });
    } catch (error) {
      throw this.asHttpError(error);
    }
  }

  findById(id: string) {
    return this.users.findById(id);
  }

  findByNickname(nickname: string) {
    return this.users.findByNickname(nickname);
  }

  async getByNickname(nickname: string) {
    const user = await this.users.findByNickname(nickname);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findWithPasswordByNickname(nickname: string) {
    return this.users.findWithPasswordByNickname(nickname);
  }

  private asHttpError(error: unknown) {
    if (error instanceof NicknameTakenError) {
      return AppException.conflict(error.message, {
        nickname: [error.message],
      });
    }
    if (error instanceof EmailTakenError) {
      return AppException.conflict(error.message, { email: [error.message] });
    }
    return error;
  }
}
