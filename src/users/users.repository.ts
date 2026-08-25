import type { EntityManager } from 'typeorm';
import type { CreateUserInput, User, UserWithPassword } from './users.types';

export abstract class UsersRepository {
  abstract create(
    input: CreateUserInput,
    manager?: EntityManager,
  ): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByNickname(nickname: string): Promise<User | null>;
  abstract findWithPasswordByNickname(
    nickname: string,
  ): Promise<UserWithPassword | null>;
  abstract existsByNickname(nickname: string): Promise<boolean>;
  abstract existsByEmail(email: string): Promise<boolean>;
}
