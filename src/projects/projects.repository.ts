import type { EntityManager } from 'typeorm';
import type {
  BoardColumn,
  CreateColumnInput,
  CreateProjectInput,
  Project,
  ProjectMembership,
  UpdateColumnInput,
  UpdateProjectInput,
} from './projects.types';

export abstract class ProjectsRepository {
  abstract create(
    input: CreateProjectInput,
    manager: EntityManager,
  ): Promise<Project>;
  abstract findById(
    id: string,
    manager?: EntityManager,
  ): Promise<Project | null>;
  abstract findOfUser(userId: string, teamId?: string): Promise<Project[]>;
  abstract findOfTeam(
    teamId: string,
    manager?: EntityManager,
  ): Promise<Project[]>;
  abstract update(
    id: string,
    input: UpdateProjectInput,
    manager: EntityManager,
  ): Promise<Project>;
  abstract delete(id: string, manager: EntityManager): Promise<void>;

  abstract findMembership(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<ProjectMembership>;

  abstract findColumns(
    projectId: string,
    manager?: EntityManager,
  ): Promise<BoardColumn[]>;
  abstract findColumn(
    columnId: string,
    manager?: EntityManager,
  ): Promise<(BoardColumn & { projectId: string }) | null>;
  abstract createColumn(
    input: CreateColumnInput,
    manager: EntityManager,
  ): Promise<BoardColumn>;
  abstract updateColumn(
    columnId: string,
    input: UpdateColumnInput,
    manager: EntityManager,
  ): Promise<BoardColumn>;
  abstract deleteColumn(
    columnId: string,
    manager: EntityManager,
  ): Promise<void>;
  abstract setColumnOrder(
    projectId: string,
    columnIds: string[],
    manager: EntityManager,
  ): Promise<void>;

  abstract moveTasks(
    projectId: string,
    from: string,
    to: string,
    manager: EntityManager,
  ): Promise<void>;
}
