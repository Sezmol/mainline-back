import type { Role, Speciality } from '../common/domain/directory';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  speciality: Speciality;
  role: Role;
  description?: string;
  workplace?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  passwordHash: string;
  speciality: Speciality;
  role: Role;
}

export interface UpdateUserInput {
  firstName: string;
  lastName: string;
  nickname: string;
  speciality: Speciality;
  role: Role;
  description?: string;
  workplace?: string;
}

export interface UserWithPassword {
  user: User;
  passwordHash: string;
}

export class NicknameTakenError extends Error {
  constructor() {
    super('Nickname is already taken');
    this.name = 'NicknameTakenError';
  }
}

export class EmailTakenError extends Error {
  constructor() {
    super('Email is already registered');
    this.name = 'EmailTakenError';
  }
}
