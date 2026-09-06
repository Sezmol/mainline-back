import type { User } from '../users/users.types';

export interface Department {
  id: string;
  companyId: string;
  name: string;
  manager: User | null;
  memberCount: number;
  createdAt: Date;
}

export interface CreateDepartmentInput {
  companyId: string;
  name: string;
  managerId: string | null;
}

export interface UpdateDepartmentInput {
  name: string;
  managerId: string | null;
}
