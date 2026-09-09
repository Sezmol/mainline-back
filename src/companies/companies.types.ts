import type { CompanyRole } from '../common/domain/directory';
import type { Cursor } from '../common/pagination/cursor';
import type { User } from '../users/users.types';

export interface Company {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  location: string | null;
  socialLinks: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyCard extends Company {
  employeeCount: number;
}

export interface ContainerRef {
  id: string;
  name: string;
  chatId: string | null;
}

export interface CompanyViewer {
  role: CompanyRole;
  departments: ContainerRef[];
  teams: ContainerRef[];
  companyChatId: string | null;
}

export interface CompanyPage extends CompanyCard {
  vacancyCount: number;
  viewer: CompanyViewer | null;
}

export interface CompanyMember {
  user: User;
  role: CompanyRole;
  joinedAt: Date;
}

export interface CreateCompanyInput {
  slug: string;
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  website?: string | null;
  location?: string | null;
  socialLinks: string[];
}

export type UpdateCompanyInput = CreateCompanyInput;

export interface FindCompaniesQuery {
  search?: string;
  cursor?: Cursor;
  limit: number;
}

export interface FindMembersQuery {
  companyId: string;
  cursor?: Cursor;
  limit: number;
}

export class SlugTakenError extends Error {
  constructor() {
    super('Company slug is already taken');
    this.name = 'SlugTakenError';
  }
}

export class DepartmentExistsError extends Error {
  constructor() {
    super('Department with this name already exists');
    this.name = 'DepartmentExistsError';
  }
}

export class TeamExistsError extends Error {
  constructor() {
    super('Team with this name already exists');
    this.name = 'TeamExistsError';
  }
}
