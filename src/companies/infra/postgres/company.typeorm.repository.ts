import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import type { CompanyRole } from '../../../common/domain/directory';
import { asUniqueViolation } from '../../../infra/database/unique-violation';
import { CompaniesRepository } from '../../companies.repository';
import {
  SlugTakenError,
  type Company,
  type CreateCompanyInput,
  type FindCompaniesQuery,
  type FindMembersQuery,
  type UpdateCompanyInput,
} from '../../companies.types';
import { CompanyMemberEntity } from './company-member.entity';
import { CompanyEntity } from './company.entity';
import { toCompany, toCompanyCard, toCompanyMember } from './company.mapper';

interface CountsRow {
  employees: string;
  vacancies: string;
}

interface MemberCountRow {
  companyId: string;
  count: number;
}

@Injectable()
export class CompanyTypeormRepository extends CompaniesRepository {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly companies: Repository<CompanyEntity>,
    @InjectRepository(CompanyMemberEntity)
    private readonly members: Repository<CompanyMemberEntity>,
  ) {
    super();
  }

  async create(input: CreateCompanyInput, manager: EntityManager) {
    const companies = manager.getRepository(CompanyEntity);

    try {
      const saved = await companies.save(
        companies.create(this.toColumns(input)),
      );
      return toCompany(saved);
    } catch (error) {
      if (asUniqueViolation(error)) throw new SlugTakenError();
      throw error;
    }
  }

  async findById(id: string, manager?: EntityManager): Promise<Company | null> {
    const found = await this.repo(manager).findOne({ where: { id } });
    return found ? toCompany(found) : null;
  }

  async findBySlug(slug: string): Promise<Company | null> {
    const found = await this.companies.findOne({ where: { slug } });
    return found ? toCompany(found) : null;
  }

  async isSlugTaken(slug: string) {
    return (await this.companies.countBy({ slug })) > 0;
  }

  async findMany({ search, cursor, limit }: FindCompaniesQuery) {
    const query = this.companies
      .createQueryBuilder('company')
      .orderBy('company.createdAt', 'DESC')
      .addOrderBy('company.id', 'DESC')
      .take(limit);

    if (search) {
      query.andWhere('company.name ILIKE :search', { search: `%${search}%` });
    }

    if (cursor) {
      query.andWhere(
        '(company.createdAt, company.id) < (:createdAt, :id)',
        cursor,
      );
    }

    return this.withEmployeeCounts(await query.getMany());
  }

  async findOfUser(userId: string) {
    const found = await this.companies
      .createQueryBuilder('company')
      .innerJoin(
        'company.members',
        'membership',
        'membership.userId = :userId',
        { userId },
      )
      .orderBy('company.name', 'ASC')
      .getMany();

    return this.withEmployeeCounts(found);
  }

  async update(id: string, input: UpdateCompanyInput) {
    try {
      await this.companies.update(id, this.toColumns(input));
    } catch (error) {
      if (asUniqueViolation(error)) throw new SlugTakenError();
      throw error;
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error(`Company ${id} vanished right after a write`);
    return updated;
  }

  async readCounts(companyId: string) {
    const rows = await this.companies.query<CountsRow[]>(
      `SELECT
         (SELECT count(*) FROM company_members WHERE "companyId" = $1) AS employees,
         (SELECT count(*) FROM posts WHERE "companyId" = $1 AND "type" = 'vacancy') AS vacancies`,
      [companyId],
    );

    return {
      employees: Number(rows[0]?.employees ?? 0),
      vacancies: Number(rows[0]?.vacancies ?? 0),
    };
  }

  async findMembership(
    companyId: string,
    userId: string,
    manager?: EntityManager,
  ) {
    const found = await this.memberRepo(manager).findOne({
      where: { companyId, userId },
      relations: { user: true },
    });

    return found ? toCompanyMember(found) : null;
  }

  async findMembers({ companyId, cursor, limit }: FindMembersQuery) {
    const query = this.members
      .createQueryBuilder('member')
      .innerJoinAndSelect('member.user', 'user')
      .where('member.companyId = :companyId', { companyId })
      .orderBy('member.joinedAt', 'ASC')
      .addOrderBy('member.userId', 'ASC')
      .take(limit);

    if (cursor) {
      query.andWhere(
        '(member.joinedAt, member.userId) > (:createdAt, :id)',
        cursor,
      );
    }

    return (await query.getMany()).map(toCompanyMember);
  }

  async addMember(
    companyId: string,
    userId: string,
    role: CompanyRole,
    manager: EntityManager,
  ) {
    const members = manager.getRepository(CompanyMemberEntity);
    await members.save(members.create({ companyId, userId, role }));

    const saved = await members.findOne({
      where: { companyId, userId },
      relations: { user: true },
    });

    if (!saved) throw new Error('Membership vanished right after a write');
    return toCompanyMember(saved);
  }

  async setRole(
    companyId: string,
    userId: string,
    role: CompanyRole,
    manager: EntityManager,
  ) {
    await manager
      .getRepository(CompanyMemberEntity)
      .update({ companyId, userId }, { role });
  }

  async removeMember(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ) {
    const { affected } = await manager
      .getRepository(CompanyMemberEntity)
      .delete({ companyId, userId });

    return (affected ?? 0) > 0;
  }

  private async withEmployeeCounts(found: CompanyEntity[]) {
    if (found.length === 0) return [];

    const rows = await this.members
      .createQueryBuilder('member')
      .select('member.companyId', 'companyId')
      .addSelect('count(*)::int', 'count')
      .where('member.companyId IN (:...ids)', {
        ids: found.map((company) => company.id),
      })
      .groupBy('member.companyId')
      .getRawMany<MemberCountRow>();

    const counts = new Map(rows.map((row) => [row.companyId, row.count]));

    return found.map((company) =>
      toCompanyCard(
        Object.assign(company, { employeeCount: counts.get(company.id) ?? 0 }),
      ),
    );
  }

  private toColumns(input: UpdateCompanyInput) {
    return {
      slug: input.slug,
      name: input.name,
      logoUrl: input.logoUrl || null,
      description: input.description || null,
      website: input.website || null,
      location: input.location || null,
      socialLinks: input.socialLinks,
    };
  }

  private repo(manager?: EntityManager) {
    return manager ? manager.getRepository(CompanyEntity) : this.companies;
  }

  private memberRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(CompanyMemberEntity) : this.members;
  }
}
