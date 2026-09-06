import type { CompanyRole } from '../common/domain/directory';
import type { User } from '../users/users.types';

export interface Team {
  id: string;
  companyId: string | null;
  companySlug: string | null;
  companyName: string | null;
  name: string;
  description: string | null;
  manager: User;
  memberCount: number;
  chatId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  user: User;
  companyRole: CompanyRole | null;
  departments: string[];
  joinedAt: Date;
}

export interface CreateTeamInput {
  companyId: string | null;
  name: string;
  description: string | null;
  managerId: string;
}

export interface UpdateTeamInput {
  name: string;
  description: string | null;
}
