import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ChatEventsPublisher } from '../chats/chat-events.publisher';
import { ChatsService } from '../chats/chats.service';
import type { CompanyRole } from '../common/domain/directory';
import { AppException } from '../common/errors/app.exception';
import { toPage } from '../common/pagination/cursor';
import type { PageQueryDto } from '../common/pagination/page-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import type { User } from '../users/users.types';
import { CompaniesRepository } from './companies.repository';
import { companyAccess } from './company-access';
import { CompanyContextService } from './company-context.service';
import { DepartmentsRepository } from './departments.repository';
import { TeamsService } from './teams.service';

@Injectable()
export class MembersService extends CompanyContextService {
  constructor(
    companies: CompaniesRepository,
    private readonly departments: DepartmentsRepository,
    private readonly teams: TeamsService,
    private readonly chats: ChatsService,
    private readonly notifications: NotificationsService,
    private readonly events: ChatEventsPublisher,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super(companies);
  }

  async list(companyId: string, viewerId: string, query: PageQueryDto) {
    const ctx = await this.context(companyId, viewerId);
    this.assert(companyAccess.read(ctx), 'Only employees see the staff list');

    const found = await this.companies.findMembers({
      companyId,
      ...(query.cursor ? { cursor: query.cursor } : {}),
      limit: query.limit + 1,
    });

    return toPage(found, query.limit, (member) => ({
      createdAt: member.joinedAt,
      id: member.user.id,
    }));
  }

  async setRole(
    companyId: string,
    actor: User,
    userId: string,
    role: CompanyRole,
  ) {
    const ctx = await this.context(companyId, actor.id);
    this.assert(companyAccess.setRole(ctx), 'Only the owner assigns roles');

    if (userId === actor.id) {
      throw AppException.validation('Use transfer of ownership to step down');
    }
    if (role === 'owner') {
      throw AppException.validation('Ownership is handed over, not assigned');
    }

    await this.requireMembership(companyId, userId);

    await this.dataSource.transaction((manager) =>
      this.companies.setRole(companyId, userId, role, manager),
    );

    return this.requireMembership(companyId, userId);
  }

  async transferOwnership(companyId: string, actor: User, userId: string) {
    const ctx = await this.context(companyId, actor.id);
    this.assert(
      companyAccess.transferOwnership(ctx),
      'Only the owner hands the company over',
    );

    if (userId === actor.id) {
      throw AppException.validation('You already own this company');
    }

    await this.requireMembership(companyId, userId);

    await this.dataSource.transaction(async (manager) => {
      await this.companies.setRole(companyId, actor.id, 'manager', manager);
      await this.companies.setRole(companyId, userId, 'owner', manager);

      await this.chats.setGroupOwner('company', companyId, userId, manager);
    });
  }

  async remove(companyId: string, actor: User, userId: string) {
    const company = await this.companies.findById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    const ctx = await this.context(companyId, actor.id);
    const target = await this.requireMembership(companyId, userId);
    const leaving = actor.id === userId;

    if (leaving && target.role === 'owner') {
      throw AppException.validation('Hand the company over before you leave');
    }
    if (!leaving) {
      this.assert(
        companyAccess.removeMember(ctx, target.role),
        'You cannot remove this person',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await this.teams.removeFromCompanyTeams(companyId, userId, manager);

      await this.departments.clearManager(companyId, userId, manager);

      await this.companies.removeMember(companyId, userId, manager);
      await this.chats.leaveCompanyChats(companyId, userId, manager);

      if (!leaving) {
        await this.notifications.create(
          {
            userId,
            actorId: actor.id,
            companyId,
            type: 'membership_removed',
            subject: company.name,
          },
          manager,
        );
      }
    });

    if (!leaving) this.events.notificationCreated(userId);
  }

  private async requireMembership(companyId: string, userId: string) {
    const membership = await this.companies.findMembership(companyId, userId);

    if (!membership) {
      throw new NotFoundException('This person is not in the company');
    }

    return membership;
  }
}
