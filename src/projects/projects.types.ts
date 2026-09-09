import type { ColumnKind } from '../common/domain/directory';
import type { User } from '../users/users.types';

export interface ProjectTeam {
  id: string;
  name: string;
  companyId: string | null;
  companySlug: string | null;
  companyName: string | null;
}

export interface BoardColumn {
  id: string;
  name: string;
  kind: ColumnKind;
  position: number;
}

export interface TaskCounts {
  total: number;
  todo: number;
  doing: number;
  done: number;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  membersCanEditTasks: boolean;
  attachments: string[];
  team: ProjectTeam;
  manager: User;
  counts: TaskCounts;
  chatId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  teamId: string;
  managerId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  attachments: string[];
}

export interface UpdateProjectInput {
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  membersCanEditTasks: boolean;
  attachments: string[];
}

export interface CreateColumnInput {
  projectId: string;
  name: string;
  kind: ColumnKind;
}

export interface UpdateColumnInput {
  name: string;
  kind: ColumnKind;
}

export interface ProjectMembership {
  isManager: boolean;
  isMember: boolean;
  isCompanyOwner: boolean;
}

export class ProjectExistsError extends Error {
  constructor() {
    super('A project with this name already exists in the team');
    this.name = 'ProjectExistsError';
  }
}

export class ColumnExistsError extends Error {
  constructor() {
    super('A column with this name already exists on the board');
    this.name = 'ColumnExistsError';
  }
}
