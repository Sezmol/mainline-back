import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { ChatEventsPublisher } from '../chats/chat-events.publisher';
import { ChatsService } from '../chats/chats.service';
import { AppException } from '../common/errors/app.exception';
import { asUniqueViolation } from '../infra/database/unique-violation';
import { NotificationsService } from '../notifications/notifications.service';
import type { User } from '../users/users.types';
import { CompaniesRepository } from './companies.repository';
import { TeamExistsError } from './companies.types';
import { companyAccess, teamAccess } from './company-access';
import { CompanyContextService } from './company-context.service';
import type { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { TeamsRepository } from './teams.repository';
import type { Team } from './teams.types';

@Injectable()
export class TeamsService extends CompanyContextService {
  constructor(
    companies: CompaniesRepository,
    private readonly teams: TeamsRepository,
    private readonly chats: ChatsService,
    private readonly notifications: NotificationsService,
    private readonly events: ChatEventsPublisher,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super(companies);
  }

  async create(actor: User, dto: CreateTeamDto) {
    if (dto.companyId) {
      const ctx = await this.context(dto.companyId, actor.id);
      this.assert(
        companyAccess.createTeam(ctx),
        'You cannot create teams in this company',
      );
    }

    try {
      return await this.dataSource.transaction((manager) =>
        this.createIn(actor, dto, manager),
      );
    } catch (error) {
      this.rethrowNameConflict(error);
    }
  }

  async createIn(actor: User, dto: CreateTeamDto, manager: EntityManager) {
    const team = await this.teams.create(
      {
        companyId: dto.companyId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        managerId: actor.id,
      },
      manager,
    );

    await this.teams.addMember(team.id, actor.id, manager);

    const chat = await this.chats.ensureTeamChat(team, actor.id, manager);
    await this.chats.joinGroup(chat, actor.id, manager);

    return this.require(team.id, manager);
  }

  list(userId: string, companyId?: string) {
    return this.teams.findOfUser(userId, companyId);
  }

  async findById(teamId: string, viewerId: string) {
    const team = await this.require(teamId);
    const isMember = await this.teams.isMember(teamId, viewerId);
    const ctx = team.companyId
      ? await this.context(team.companyId, viewerId)
      : null;

    if (!teamAccess.view(ctx, team.manager.id, isMember)) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async update(teamId: string, actor: User, dto: UpdateTeamDto) {
    const team = await this.findById(teamId, actor.id);
    const ctx = team.companyId
      ? await this.context(team.companyId, actor.id)
      : null;

    this.assert(
      teamAccess.edit(ctx, team.manager.id, actor.id),
      'Only the team lead or the company owner edits a team',
    );

    try {
      return await this.dataSource.transaction(async (manager) => {
        const updated = await this.teams.update(
          teamId,
          { name: dto.name, description: dto.description ?? null },
          manager,
        );

        if (dto.name !== team.name) {
          await this.chats.renameGroup('team', teamId, dto.name, manager);
        }

        return updated;
      });
    } catch (error) {
      this.rethrowNameConflict(error);
    }
  }

  async remove(teamId: string, actor: User) {
    const team = await this.findById(teamId, actor.id);
    const ctx = team.companyId
      ? await this.context(team.companyId, actor.id)
      : null;

    this.assert(
      teamAccess.remove(ctx, team.manager.id, actor.id),
      'Only the team lead or the company owner disbands a team',
    );

    await this.dataSource.transaction((manager) => this.disband(team, manager));
  }

  async members(teamId: string, viewerId: string) {
    await this.findById(teamId, viewerId);
    return this.teams.findMembers(teamId);
  }

  async removeMember(teamId: string, actor: User, userId: string) {
    const team = await this.findById(teamId, actor.id);
    const leaving = actor.id === userId;

    if (!leaving) {
      this.assert(
        teamAccess.manageMembers(actor.id, team.manager.id),
        'Only the team lead manages its members',
      );
    }
    if (userId === team.manager.id) {
      throw AppException.validation(
        'The team lead leaves by disbanding the team',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      if (!(await this.teams.removeMember(teamId, userId, manager))) {
        throw new NotFoundException('This person is not in the team');
      }

      await this.chats.leaveGroup('team', teamId, userId, manager);
      await this.chats.leaveTeamProjectChats(teamId, userId, manager);

      if (!leaving) {
        await this.notifications.create(
          {
            userId,
            actorId: actor.id,
            ...(team.companyId ? { companyId: team.companyId } : {}),
            type: 'membership_removed',
            subject: team.name,
          },
          manager,
        );
      }
    });

    if (!leaving) this.events.notificationCreated(userId);
  }

  async assertCanJoin(team: Team, userId: string) {
    if (!team.companyId) return;

    if (!(await this.companies.findMembership(team.companyId, userId))) {
      throw AppException.validation(
        'Only people from the company can join this team',
      );
    }
  }

  async addMemberChecked(
    teamId: string,
    userId: string,
    manager: EntityManager,
  ) {
    try {
      await this.teams.addMember(teamId, userId, manager);
    } catch (error) {
      if (asUniqueViolation(error)) {
        throw AppException.conflict('This person is already in the team');
      }
      throw error;
    }
  }

  async removeFromCompanyTeams(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ) {
    const teams = await this.teams.findCompanyTeamsOfMember(
      companyId,
      userId,
      manager,
    );

    for (const team of teams) {
      if (team.manager.id === userId) {
        await this.disband(team, manager);
        continue;
      }

      await this.teams.removeMember(team.id, userId, manager);
      await this.chats.leaveGroup('team', team.id, userId, manager);
      await this.chats.leaveTeamProjectChats(team.id, userId, manager);
    }
  }

  async require(teamId: string, manager?: EntityManager) {
    const team = await this.teams.findById(teamId, manager);
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  private async disband(team: Team, manager: EntityManager) {
    await this.chats.deleteGroupChat('team', team.id, manager);
    await this.teams.delete(team.id, manager);
  }

  private rethrowNameConflict(error: unknown): never {
    if (error instanceof TeamExistsError) {
      const message = 'A team with this name already exists here';
      throw AppException.conflict(message, { name: [message] });
    }

    throw error;
  }
}
