import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { asUniqueViolation } from '../../../infra/database/unique-violation';
import { toUser } from '../../../users/infra/postgres/user.mapper';
import { DepartmentExistsError } from '../../companies.types';
import type { ContainerRef } from '../../companies.types';
import { DepartmentsRepository } from '../../departments.repository';
import type {
  CreateDepartmentInput,
  Department,
  UpdateDepartmentInput,
} from '../../departments.types';
import { CompanyMemberEntity } from './company-member.entity';
import { toCompanyMember } from './company.mapper';
import { DepartmentMemberEntity } from './department-member.entity';
import { DepartmentEntity } from './department.entity';

interface MemberCountRow {
  departmentId: string;
  count: number;
}

const toDepartment = (entity: DepartmentEntity) => ({
  id: entity.id,
  companyId: entity.companyId,
  name: entity.name,
  manager: entity.manager ? toUser(entity.manager) : null,
  memberCount: entity.memberCount ?? 0,
  createdAt: entity.createdAt,
});

@Injectable()
export class DepartmentTypeormRepository extends DepartmentsRepository {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly departments: Repository<DepartmentEntity>,
    @InjectRepository(DepartmentMemberEntity)
    private readonly members: Repository<DepartmentMemberEntity>,
  ) {
    super();
  }

  async create(input: CreateDepartmentInput, manager: EntityManager) {
    const repo = manager.getRepository(DepartmentEntity);

    let id: string;
    try {
      ({ id } = await repo.save(repo.create(input)));
    } catch (error) {
      if (asUniqueViolation(error)) throw new DepartmentExistsError();
      throw error;
    }

    const saved = await this.findById(id, manager);
    if (!saved) throw new Error(`Department ${id} vanished after a write`);
    return saved;
  }

  async findById(id: string, manager?: EntityManager) {
    const found = await this.repo(manager).findOne({
      where: { id },
      relations: { manager: true },
    });

    if (!found) return null;

    found.memberCount = await this.memberRepo(manager).countBy({
      departmentId: id,
    });

    return toDepartment(found);
  }

  async findByCompany(companyId: string) {
    const found = await this.departments.find({
      where: { companyId },
      relations: { manager: true },
      order: { createdAt: 'ASC' },
    });

    if (found.length === 0) return [];

    const rows = await this.members
      .createQueryBuilder('member')
      .select('member.departmentId', 'departmentId')
      .addSelect('count(*)::int', 'count')
      .where('member.companyId = :companyId', { companyId })
      .groupBy('member.departmentId')
      .getRawMany<MemberCountRow>();

    const counts = new Map(rows.map((row) => [row.departmentId, row.count]));

    return found.map((department) =>
      toDepartment(
        Object.assign(department, {
          memberCount: counts.get(department.id) ?? 0,
        }),
      ),
    );
  }

  findOfMember(companyId: string, userId: string) {
    return this.members.query<ContainerRef[]>(
      `SELECT d."id", d."name", c."id" AS "chatId"
         FROM department_members dm
         JOIN departments d ON d."id" = dm."departmentId"
         LEFT JOIN chats c ON c."dedupeKey" = 'department:' || d."id"
        WHERE dm."companyId" = $1 AND dm."userId" = $2
        ORDER BY d."name" ASC`,
      [companyId, userId],
    );
  }

  async update(
    id: string,
    input: UpdateDepartmentInput,
    manager: EntityManager,
  ) {
    try {
      await manager.getRepository(DepartmentEntity).update(id, input);
    } catch (error) {
      if (asUniqueViolation(error)) throw new DepartmentExistsError();
      throw error;
    }

    const updated = await this.findById(id, manager);
    if (!updated) throw new Error(`Department ${id} vanished after a write`);
    return updated;
  }

  async delete(id: string, manager: EntityManager) {
    await manager.getRepository(DepartmentEntity).delete(id);
  }

  async clearManager(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ) {
    await manager
      .getRepository(DepartmentEntity)
      .update({ companyId, managerId: userId }, { managerId: null });
  }

  async findMembers(departmentId: string) {
    const found = await this.members
      .createQueryBuilder('dm')
      .innerJoinAndMapOne(
        'dm.membership',
        CompanyMemberEntity,
        'membership',
        'membership."companyId" = dm."companyId" AND membership."userId" = dm."userId"',
      )
      .innerJoinAndSelect('membership.user', 'user')
      .where('dm.departmentId = :departmentId', { departmentId })
      .orderBy('dm.joinedAt', 'ASC')
      .getMany();

    return found.map(({ userId, membership }) => {
      if (!membership)
        throw new Error(`Membership of ${userId} was not joined`);
      return toCompanyMember(membership);
    });
  }

  async isMember(
    departmentId: string,
    userId: string,
    manager?: EntityManager,
  ) {
    return (
      (await this.memberRepo(manager).countBy({ departmentId, userId })) > 0
    );
  }

  async addMember(
    department: Department,
    userId: string,
    manager: EntityManager,
  ) {
    const repo = manager.getRepository(DepartmentMemberEntity);

    await repo.save(
      repo.create({
        departmentId: department.id,
        companyId: department.companyId,
        userId,
      }),
    );
  }

  async removeMember(
    departmentId: string,
    userId: string,
    manager: EntityManager,
  ) {
    const { affected } = await manager
      .getRepository(DepartmentMemberEntity)
      .delete({ departmentId, userId });

    return (affected ?? 0) > 0;
  }

  private repo(manager?: EntityManager) {
    return manager ? manager.getRepository(DepartmentEntity) : this.departments;
  }

  private memberRepo(manager?: EntityManager) {
    return manager
      ? manager.getRepository(DepartmentMemberEntity)
      : this.members;
  }
}
