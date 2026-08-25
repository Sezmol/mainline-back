import type { UserEntity } from './user.entity';

export const toUser = (entity: UserEntity) => ({
  id: entity.id,
  firstName: entity.firstName,
  lastName: entity.lastName,
  nickname: entity.nickname,
  email: entity.email,
  speciality: entity.speciality,
  role: entity.role,
  ...(entity.description ? { description: entity.description } : {}),
  ...(entity.workplace ? { workplace: entity.workplace } : {}),
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
