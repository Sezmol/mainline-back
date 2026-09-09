import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { ChatEventsPublisher } from '../chats/chat-events.publisher';
import { ChatsService } from '../chats/chats.service';
import { AppException } from '../common/errors/app.exception';
import { asForeignKeyViolation } from '../infra/database/unique-violation';
import { NotificationsService } from '../notifications/notifications.service';
import type { User } from '../users/users.types';
import { CompaniesRepository } from './companies.repository';
import { DepartmentExistsError } from './companies.types';
import { companyAccess, departmentAccess } from './company-access';
import { CompanyContextService } from './company-context.service';
import { DepartmentsRepository } from './departments.repository';
import type { Department } from './departments.types';
import type {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto';

@Injectable()
export class DepartmentsService extends CompanyContextService {
  constructor(
    companies: CompaniesRepository,
    private readonly departments: DepartmentsRepository,
    private readonly chats: ChatsService,
    private readonly notifications: NotificationsService,
    private readonly events: ChatEventsPublisher,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super(companies);
  }

  async list(companyId: string, viewerId: string) {
    await this.requireMember(companyId, viewerId);
    return this.departments.findByCompany(companyId);
  }

  async create(companyId: string, actor: User, dto: CreateDepartmentDto) {
    const ctx = await this.context(companyId, actor.id);
    this.assert(
      companyAccess.createDepartment(ctx),
      'Only an owner or HR creates departments',
    );

    const managerId = dto.managerId ?? null;
    if (managerId) await this.assertManagerIsMember(companyId, managerId);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const department = await this.departments.create(
          { companyId, name: dto.name, managerId },
          manager,
        );

        const chat = await this.chats.ensureDepartmentChat(
          department,
          managerId ?? actor.id,
          manager,
        );

        if (!managerId) return department;

        await this.departments.addMember(department, managerId, manager);
        await this.chats.joinGroup(chat, managerId, manager);

        return this.require(companyId, department.id, manager);
      });
    } catch (error) {
      this.rethrowNameConflict(error);
    }
  }

  async update(
    companyId: string,
    departmentId: string,
    actor: User,
    dto: UpdateDepartmentDto,
  ) {
    const ctx = await this.context(companyId, actor.id);
    this.assert(
      departmentAccess.edit(ctx),
      'Only an owner or HR edits a department',
    );

    const department = await this.require(companyId, departmentId);
    const managerId = dto.managerId ?? null;

    if (managerId) await this.assertManagerIsMember(companyId, managerId);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const updated = await this.departments.update(
          departmentId,
          { name: dto.name, managerId },
          manager,
        );

        if (dto.name !== department.name) {
          await this.chats.renameGroup(
            'department',
            departmentId,
            dto.name,
            manager,
          );
        }

        if (
          managerId &&
          !(await this.departments.isMember(departmentId, managerId, manager))
        ) {
          await this.departments.addMember(updated, managerId, manager);
          await this.chats.joinGroupChat(
            'department',
            departmentId,
            managerId,
            manager,
          );
        }

        return updated;
      });
    } catch (error) {
      this.rethrowNameConflict(error);
    }
  }

  async remove(companyId: string, departmentId: string, actor: User) {
    const ctx = await this.context(companyId, actor.id);
    this.assert(
      departmentAccess.edit(ctx),
      'Only an owner or HR deletes a department',
    );

    await this.require(companyId, departmentId);

    await this.dataSource.transaction(async (manager) => {
      await this.chats.deleteGroupChat('department', departmentId, manager);
      await this.departments.delete(departmentId, manager);
    });
  }

  async members(companyId: string, departmentId: string, viewerId: string) {
    await this.requireMember(companyId, viewerId);
    await this.require(companyId, departmentId);

    return this.departments.findMembers(departmentId);
  }

  async removeMember(
    companyId: string,
    departmentId: string,
    actor: User,
    userId: string,
  ) {
    const department = await this.require(companyId, departmentId);
    const ctx = await this.context(companyId, actor.id);
    const leaving = actor.id === userId;

    if (!leaving) {
      this.assert(
        departmentAccess.manageMembers(ctx, department.manager?.id ?? null),
        'Only the head of the department or company staff manage its members',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const removed = await this.departments.removeMember(
        departmentId,
        userId,
        manager,
      );

      if (!removed) {
        throw new NotFoundException('This person is not in the department');
      }

      await this.chats.leaveGroup('department', departmentId, userId, manager);

      if (department.manager?.id === userId) {
        await this.departments.update(
          departmentId,
          { name: department.name, managerId: null },
          manager,
        );
      }

      if (!leaving) {
        await this.notifications.create(
          {
            userId,
            actorId: actor.id,
            companyId,
            type: 'membership_removed',
            subject: department.name,
          },
          manager,
        );
      }
    });

    if (!leaving) this.events.notificationCreated(userId);
  }

  async addMemberChecked(
    department: Department,
    userId: string,
    manager: EntityManager,
  ) {
    try {
      await this.departments.addMember(department, userId, manager);
    } catch (error) {
      if (asForeignKeyViolation(error)) {
        throw AppException.validation('This person no longer works here');
      }
      throw error;
    }
  }

  async require(
    companyId: string,
    departmentId: string,
    manager?: EntityManager,
  ) {
    const department = await this.departments.findById(departmentId, manager);

    if (!department || department.companyId !== companyId) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  private async assertManagerIsMember(companyId: string, userId: string) {
    if (!(await this.companies.findMembership(companyId, userId))) {
      throw AppException.validation('The head of a department must work here');
    }
  }

  private rethrowNameConflict(error: unknown): never {
    if (error instanceof DepartmentExistsError) {
      const message = 'A department with this name already exists';
      throw AppException.conflict(message, { name: [message] });
    }

    throw error;
  }
}
