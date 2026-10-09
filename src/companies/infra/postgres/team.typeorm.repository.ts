import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type EntityManager } from 'typeorm';
import type { CompanyRole } from '../../../common/domain/directory';
import { asUniqueViolation } from '../../../infra/database/unique-violation';
import { toUser } from '../../../users/infra/postgres/user.mapper';
import {
  TeamExistsError,
  TeamMemberExistsError,
  type ContainerRef,
} from '../../companies.types';
import { TeamsRepository } from '../../teams.repository';
import type {
  CreateTeamInput,
  TeamMember,
  UpdateTeamInput,
} from '../../teams.types';
import { CompanyMemberEntity } from './company-member.entity';
import { DepartmentMemberEntity } from './department-member.entity';
import { TeamMemberEntity } from './team-member.entity';
import { TeamEntity } from './team.entity';

const TEAM_RELATIONS = { manager: true, company: true } as const;

interface MemberCountRow {
  teamId: string;
  count: number;
}

interface ChatRow {
  teamId: string;
  chatId: string;
}

const toTeam = (entity: TeamEntity) => ({
  id: entity.id,
  companyId: entity.companyId,
  companySlug: entity.company?.slug ?? null,
  companyName: entity.company?.name ?? null,
  name: entity.name,
  description: entity.description,
  manager: toUser(entity.manager),
  memberCount: entity.memberCount ?? 0,
  chatId: entity.chatId ?? null,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

@Injectable()
export class TeamTypeormRepository extends TeamsRepository {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teams: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly members: Repository<TeamMemberEntity>,
    @InjectRepository(CompanyMemberEntity)
    private readonly companyMembers: Repository<CompanyMemberEntity>,
    @InjectRepository(DepartmentMemberEntity)
    private readonly departmentMembers: Repository<DepartmentMemberEntity>,
  ) {
    super();
  }

  async create(input: CreateTeamInput, manager: EntityManager) {
    const repo = manager.getRepository(TeamEntity);

    let id: string;
    try {
      ({ id } = await repo.save(repo.create(input)));
    } catch (error) {
      if (asUniqueViolation(error)) throw new TeamExistsError();
      throw error;
    }

    const saved = await this.findById(id, manager);
    if (!saved) throw new Error(`Team ${id} vanished right after a write`);
    return saved;
  }

  async findById(id: string, manager?: EntityManager) {
    const found = await this.repo(manager).findOne({
      where: { id },
      relations: TEAM_RELATIONS,
    });

    if (!found) return null;

    const [withExtras] = await this.withExtras([found], manager);
    return withExtras ?? toTeam(found);
  }

  async findOfUser(userId: string, companyId?: string) {
    const query = this.teams
      .createQueryBuilder('team')
      .innerJoin('team.members', 'membership', 'membership.userId = :userId', {
        userId,
      })
      .innerJoinAndSelect('team.manager', 'manager')
      .leftJoinAndSelect('team.company', 'company')
      .orderBy('team.updatedAt', 'DESC')
      .addOrderBy('team.id', 'DESC');

    if (companyId) {
      query.andWhere('team.companyId = :companyId', { companyId });
    }

    return this.withExtras(await query.getMany());
  }

  findOfMember(companyId: string, userId: string) {
    return this.members.query<ContainerRef[]>(
      `SELECT t."id", t."name", c."id" AS "chatId"
         FROM team_members tm
         JOIN teams t ON t."id" = tm."teamId"
         LEFT JOIN chats c ON c."dedupeKey" = 'team:' || t."id"
        WHERE t."companyId" = $1 AND tm."userId" = $2
        ORDER BY t."name" ASC`,
      [companyId, userId],
    );
  }

  async update(id: string, input: UpdateTeamInput, manager: EntityManager) {
    try {
      await manager.getRepository(TeamEntity).update(id, input);
    } catch (error) {
      if (asUniqueViolation(error)) throw new TeamExistsError();
      throw error;
    }

    const updated = await this.findById(id, manager);
    if (!updated) throw new Error(`Team ${id} vanished right after a write`);
    return updated;
  }

  async delete(id: string, manager: EntityManager) {
    await manager.getRepository(TeamEntity).delete(id);
  }

  async findMembers(teamId: string) {
    const rows = await this.members.find({
      where: { teamId },
      relations: { user: true, team: true },
      order: { joinedAt: 'ASC' },
    });

    const companyId = rows[0]?.team.companyId ?? null;
    const userIds = rows.map((row) => row.userId);

    const [roles, departments] = await Promise.all([
      this.rolesIn(companyId, userIds),
      this.departmentsIn(companyId, userIds),
    ]);

    return rows.map<TeamMember>((row) => ({
      user: toUser(row.user),
      companyRole: roles.get(row.userId) ?? null,
      departments: departments.get(row.userId) ?? [],
      joinedAt: row.joinedAt,
    }));
  }

  async isMember(teamId: string, userId: string, manager?: EntityManager) {
    return (await this.memberRepo(manager).countBy({ teamId, userId })) > 0;
  }

  async addMember(teamId: string, userId: string, manager: EntityManager) {
    const repo = manager.getRepository(TeamMemberEntity);

    try {
      await repo.save(repo.create({ teamId, userId }));
    } catch (error) {
      if (asUniqueViolation(error)) throw new TeamMemberExistsError();
      throw error;
    }
  }

  async removeMember(teamId: string, userId: string, manager: EntityManager) {
    const { affected } = await manager
      .getRepository(TeamMemberEntity)
      .delete({ teamId, userId });

    return (affected ?? 0) > 0;
  }

  async findCompanyTeamsOfMember(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ) {
    const found = await manager
      .getRepository(TeamEntity)
      .createQueryBuilder('team')
      .innerJoin('team.members', 'membership', 'membership.userId = :userId', {
        userId,
      })
      .innerJoinAndSelect('team.manager', 'manager')
      .leftJoinAndSelect('team.company', 'company')
      .where('team.companyId = :companyId', { companyId })
      .getMany();

    return found.map(toTeam);
  }

  private async withExtras(found: TeamEntity[], manager?: EntityManager) {
    if (found.length === 0) return [];

    const ids = found.map((team) => team.id);

    const [counts, chats] = await Promise.all([
      this.memberCounts(ids, manager),
      this.chatIds(ids, manager),
    ]);

    return found.map((team) =>
      toTeam(
        Object.assign(team, {
          memberCount: counts.get(team.id) ?? 0,
          chatId: chats.get(team.id) ?? null,
        }),
      ),
    );
  }

  private async memberCounts(ids: string[], manager?: EntityManager) {
    const rows = await this.memberRepo(manager)
      .createQueryBuilder('member')
      .select('member.teamId', 'teamId')
      .addSelect('count(*)::int', 'count')
      .where('member.teamId IN (:...ids)', { ids })
      .groupBy('member.teamId')
      .getRawMany<MemberCountRow>();

    return new Map(rows.map((row) => [row.teamId, row.count]));
  }

  private async chatIds(ids: string[], manager?: EntityManager) {
    const rows = await this.memberRepo(manager).query<ChatRow[]>(
      `SELECT split_part(c."dedupeKey", ':', 2) AS "teamId", c."id" AS "chatId"
         FROM chats c
        WHERE c."dedupeKey" = ANY($1::text[])`,
      [ids.map((id) => `team:${id}`)],
    );

    return new Map(rows.map((row) => [row.teamId, row.chatId]));
  }

  private async rolesIn(companyId: string | null, userIds: string[]) {
    if (!companyId || userIds.length === 0) {
      return new Map<string, CompanyRole>();
    }

    const rows = await this.companyMembers.find({
      where: { companyId, userId: In(userIds) },
      select: { userId: true, role: true },
    });

    return new Map(rows.map((row) => [row.userId, row.role]));
  }

  private async departmentsIn(companyId: string | null, userIds: string[]) {
    if (!companyId || userIds.length === 0) {
      return new Map<string, string[]>();
    }

    const rows = await this.departmentMembers.find({
      where: { companyId, userId: In(userIds) },
      relations: { department: true },
      order: { joinedAt: 'ASC' },
    });

    return rows.reduce((byUser, row) => {
      const names = byUser.get(row.userId) ?? [];
      names.push(row.department.name);
      return byUser.set(row.userId, names);
    }, new Map<string, string[]>());
  }

  private repo(manager?: EntityManager) {
    return manager ? manager.getRepository(TeamEntity) : this.teams;
  }

  private memberRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(TeamMemberEntity) : this.members;
  }
}
