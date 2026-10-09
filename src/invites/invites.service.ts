import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { ChatEventsPublisher } from '../chats/chat-events.publisher';
import { ChatsService } from '../chats/chats.service';
import { CompaniesRepository } from '../companies/companies.repository';
import { CompaniesService } from '../companies/companies.service';
import {
  companyAccess,
  departmentAccess,
  teamAccess,
} from '../companies/company-access';
import { DepartmentsService } from '../companies/departments.service';
import { TeamsService } from '../companies/teams.service';
import type { InviteStatus } from '../common/domain/directory';
import { AppException } from '../common/errors/app.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import type { User } from '../users/users.types';
import type { CreateInviteDto } from './dto/create-invite.dto';
import { InvitesRepository } from './invites.repository';
import {
  InviteExistsError,
  type Invite,
  type InviteTarget,
} from './invites.types';

type Decision = 'accepted' | 'declined';

interface ResolvedTarget {
  name: string;
  companyId: string | null;
}

@Injectable()
export class InvitesService {
  constructor(
    private readonly invites: InvitesRepository,
    private readonly companies: CompaniesService,
    private readonly companyMembers: CompaniesRepository,
    private readonly departments: DepartmentsService,
    private readonly teams: TeamsService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly chats: ChatsService,
    private readonly events: ChatEventsPublisher,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  list(
    userId: string,
    direction: 'incoming' | 'outgoing',
    status?: InviteStatus,
  ) {
    return this.invites.findMany({
      userId,
      direction,
      ...(status ? { status } : {}),
    });
  }

  async invite(
    target: InviteTarget,
    actor: User,
    dto: CreateInviteDto,
  ): Promise<Invite> {
    const invitee = await this.users.getByNickname(dto.nickname);

    if (invitee.id === actor.id) {
      throw AppException.validation('You are already here');
    }

    const resolved = await this.assertMayInvite(target, actor, invitee);

    let invite: Invite;
    try {
      invite = await this.dataSource.transaction(async (manager) => {
        const created = await this.invites.create(
          {
            scope: target.scope,
            companyId: resolved.companyId,
            departmentId:
              target.scope === 'department' ? target.departmentId : null,
            teamId: target.scope === 'team' ? target.teamId : null,
            role: target.scope === 'company' ? dto.role : null,
            inviterId: actor.id,
            inviteeId: invitee.id,
          },
          manager,
        );

        await this.notifications.create(
          {
            userId: invitee.id,
            actorId: actor.id,
            type: 'company_invite_received',
            inviteId: created.id,
            ...(created.companyId ? { companyId: created.companyId } : {}),
            subject: resolved.name,
          },
          manager,
        );

        return created;
      });
    } catch (error) {
      if (error instanceof InviteExistsError) {
        throw AppException.conflict('This person has already been invited');
      }
      throw error;
    }

    this.events.notificationCreated(invitee.id);
    return invite;
  }

  async decide(
    inviteId: string,
    actor: User,
    decision: Decision,
  ): Promise<Invite> {
    const invite = await this.invites.findById(inviteId);

    if (!invite || invite.invitee.id !== actor.id) {
      throw new NotFoundException('Invitation not found');
    }

    const decided = await this.dataSource.transaction(async (manager) => {
      const updated = await this.invites.answer(invite.id, decision, manager);
      if (!updated) throw this.alreadyAnswered();

      if (decision === 'accepted') await this.accept(invite, manager);

      await this.notifications.create(
        {
          userId: invite.inviter.id,
          actorId: actor.id,
          type: `company_invite_${decision}`,
          inviteId: invite.id,
          ...(invite.companyId ? { companyId: invite.companyId } : {}),
          subject: invite.target.name,
        },
        manager,
      );

      return updated;
    });

    this.events.notificationCreated(invite.inviter.id);
    return decided;
  }

  async withdraw(inviteId: string, actor: User) {
    const invite = await this.invites.findById(inviteId);

    if (!invite || invite.inviter.id !== actor.id) {
      throw new NotFoundException('Invitation not found');
    }

    if (!(await this.invites.deletePending(inviteId))) {
      throw this.alreadyAnswered();
    }
  }

  private alreadyAnswered() {
    return AppException.conflict('This invitation has already been answered');
  }

  private async accept(invite: Invite, manager: EntityManager) {
    switch (invite.scope) {
      case 'company': {
        const companyId = this.targetId(invite.companyId, 'company');

        await this.companyMembers.addMember(
          companyId,
          invite.invitee.id,
          invite.role ?? 'employee',
          manager,
        );
        await this.chats.joinGroupChat(
          'company',
          companyId,
          invite.invitee.id,
          manager,
        );
        return;
      }

      case 'department': {
        const department = await this.departments.require(
          this.targetId(invite.companyId, 'company'),
          this.targetId(invite.departmentId, 'department'),
          manager,
        );

        await this.departments.addMemberChecked(
          department,
          invite.invitee.id,
          manager,
        );
        await this.chats.joinGroupChat(
          'department',
          department.id,
          invite.invitee.id,
          manager,
        );
        return;
      }

      case 'team': {
        const team = await this.teams.require(
          this.targetId(invite.teamId, 'team'),
          manager,
        );

        await this.teams.assertCanJoin(team, invite.invitee.id);
        await this.teams.addMemberChecked(team.id, invite.invitee.id, manager);
        await this.chats.joinGroupChat(
          'team',
          team.id,
          invite.invitee.id,
          manager,
        );
        await this.chats.joinTeamProjectChats(
          team.id,
          invite.invitee.id,
          manager,
        );
        return;
      }
    }
  }

  private async assertMayInvite(
    target: InviteTarget,
    actor: User,
    invitee: User,
  ): Promise<ResolvedTarget> {
    switch (target.scope) {
      case 'company': {
        const company = await this.companies.require(target.companyId);
        const ctx = await this.companies.context(target.companyId, actor.id);

        if (!companyAccess.invite(ctx)) {
          throw new ForbiddenException('Only an owner or HR invites people');
        }

        if (
          await this.companyMembers.findMembership(target.companyId, invitee.id)
        ) {
          throw AppException.conflict('This person already works here');
        }

        return { name: company.name, companyId: company.id };
      }

      case 'department': {
        const department = await this.departments.require(
          target.companyId,
          target.departmentId,
        );
        const ctx = await this.companies.context(target.companyId, actor.id);

        if (
          !departmentAccess.manageMembers(ctx, department.manager?.id ?? null)
        ) {
          throw new ForbiddenException(
            'Only the head of the department or company staff invite into it',
          );
        }
        if (
          !(await this.companyMembers.findMembership(
            target.companyId,
            invitee.id,
          ))
        ) {
          throw AppException.validation('This person does not work here yet');
        }

        return { name: department.name, companyId: target.companyId };
      }

      case 'team': {
        const team = await this.teams.require(target.teamId);

        if (!teamAccess.manageMembers(actor.id, team.manager.id)) {
          throw new ForbiddenException(
            'Only the team lead invites into a team',
          );
        }

        await this.teams.assertCanJoin(team, invitee.id);
        return { name: team.name, companyId: team.companyId };
      }
    }
  }

  private targetId(id: string | null, kind: string) {
    if (!id) throw new Error(`Invitation has no ${kind} to point at`);
    return id;
  }
}
