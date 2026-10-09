import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { ChatsService } from '../chats/chats.service';
import { AppException } from '../common/errors/app.exception';
import { toPage } from '../common/pagination/cursor';
import type { User } from '../users/users.types';
import { DEFAULT_DEPARTMENT_NAME } from './companies.constants';
import { CompaniesRepository } from './companies.repository';
import { SlugTakenError } from './companies.types';
import { companyAccess } from './company-access';
import { CompanyContextService } from './company-context.service';
import { DepartmentsRepository } from './departments.repository';
import type { CompaniesQueryDto } from './dto/companies-query.dto';
import type { CreateCompanyDto } from './dto/create-company.dto';
import type { UpdateCompanyDto } from './dto/update-company.dto';
import { RESERVED_SLUGS } from './slug';
import { TeamsRepository } from './teams.repository';

@Injectable()
export class CompaniesService extends CompanyContextService {
  constructor(
    companies: CompaniesRepository,
    private readonly departments: DepartmentsRepository,
    private readonly teams: TeamsRepository,
    private readonly chats: ChatsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super(companies);
  }

  async create(actor: User, dto: CreateCompanyDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const company = await this.companies.create(dto, manager);

        await this.companies.addMember(company.id, actor.id, 'owner', manager);

        const department = await this.departments.create(
          {
            companyId: company.id,
            name: DEFAULT_DEPARTMENT_NAME,
            managerId: actor.id,
          },
          manager,
        );
        await this.departments.addMember(department, actor.id, manager);

        const companyChat = await this.chats.ensureCompanyChat(
          company,
          actor.id,
          manager,
        );
        await this.chats.joinGroup(companyChat, actor.id, manager);

        const departmentChat = await this.chats.ensureDepartmentChat(
          department,
          actor.id,
          manager,
        );
        await this.chats.joinGroup(departmentChat, actor.id, manager);

        return company;
      });
    } catch (error) {
      this.rethrowSlugConflict(error);
    }
  }

  async update(companyId: string, actor: User, dto: UpdateCompanyDto) {
    const ctx = await this.context(companyId, actor.id);
    this.assert(companyAccess.edit(ctx), 'Only the owner edits the company');

    await this.require(companyId);

    try {
      return await this.companies.update(companyId, dto);
    } catch (error) {
      this.rethrowSlugConflict(error);
    }
  }

  async page(slug: string, viewerId?: string) {
    const company = await this.companies.findBySlug(slug.toLowerCase());
    if (!company) throw new NotFoundException('Company not found');

    const [counts, viewer] = await Promise.all([
      this.companies.readCounts(company.id),
      viewerId
        ? this.viewerSection(company.id, viewerId)
        : Promise.resolve(null),
    ]);

    return {
      ...company,
      employeeCount: counts.employees,
      vacancyCount: counts.vacancies,
      viewer,
    };
  }

  async list(query: CompaniesQueryDto) {
    const found = await this.companies.findMany({
      ...(query.q ? { search: query.q } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {}),
      limit: query.limit + 1,
    });

    return toPage(found, query.limit, (company) => company);
  }

  async availability(slug: string) {
    const wanted = slug.toLowerCase();
    if (RESERVED_SLUGS.has(wanted)) return { available: false };

    const taken = await this.companies.isSlugTaken(wanted);
    return { available: !taken };
  }

  mine(userId: string) {
    return this.companies.findOfUser(userId);
  }

  async require(companyId: string, manager?: EntityManager) {
    const company = await this.companies.findById(companyId, manager);
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  private async viewerSection(companyId: string, userId: string) {
    const membership = await this.companies.findMembership(companyId, userId);
    if (!membership) return null;

    const [departments, teams, chat] = await Promise.all([
      this.departments.findOfMember(companyId, userId),
      this.teams.findOfMember(companyId, userId),
      this.chats.findGroupChat('company', companyId),
    ]);

    return {
      role: membership.role,
      departments,
      teams,
      companyChatId: chat?.id ?? null,
    };
  }

  private rethrowSlugConflict(error: unknown): never {
    if (error instanceof SlugTakenError) {
      throw AppException.conflict('That address is already taken', {
        slug: ['That address is already taken'],
      });
    }

    throw error;
  }
}
