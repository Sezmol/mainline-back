import type { EntityManager } from 'typeorm';
import type { ContainerRef } from './companies.types';
import type {
  CreateTeamInput,
  Team,
  TeamMember,
  UpdateTeamInput,
} from './teams.types';

export abstract class TeamsRepository {
  abstract create(
    input: CreateTeamInput,
    manager: EntityManager,
  ): Promise<Team>;
  abstract findById(id: string, manager?: EntityManager): Promise<Team | null>;
  abstract findOfUser(userId: string, companyId?: string): Promise<Team[]>;
  abstract findOfMember(
    companyId: string,
    userId: string,
  ): Promise<ContainerRef[]>;
  abstract update(
    id: string,
    input: UpdateTeamInput,
    manager: EntityManager,
  ): Promise<Team>;
  abstract delete(id: string, manager: EntityManager): Promise<void>;

  abstract findMembers(teamId: string): Promise<TeamMember[]>;
  abstract isMember(
    teamId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  abstract addMember(
    teamId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<void>;
  abstract removeMember(
    teamId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<boolean>;

  abstract findCompanyTeamsOfMember(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<Team[]>;
}
