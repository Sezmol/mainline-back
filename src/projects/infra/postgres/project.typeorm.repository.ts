import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { TeamMemberEntity } from '../../../companies/infra/postgres/team-member.entity';
import type { ColumnKind } from '../../../common/domain/directory';
import { asUniqueViolation } from '../../../infra/database/unique-violation';
import { toUser } from '../../../users/infra/postgres/user.mapper';
import { ProjectsRepository } from '../../projects.repository';
import {
  ColumnExistsError,
  ProjectExistsError,
  type BoardColumn,
  type CreateColumnInput,
  type CreateProjectInput,
  type Project,
  type ProjectMembership,
  type TaskCounts,
  type UpdateColumnInput,
  type UpdateProjectInput,
} from '../../projects.types';
import { BoardColumnEntity } from './board-column.entity';
import { ProjectEntity } from './project.entity';

const PROJECT_RELATIONS = {
  manager: true,
  team: { company: true },
} as const;

const EMPTY_COUNTS: TaskCounts = { total: 0, todo: 0, doing: 0, done: 0 };

interface CountRow {
  projectId: string;
  kind: ColumnKind;
  count: number;
}

interface ChatRow {
  projectId: string;
  chatId: string;
}

interface MembershipRow {
  isManager: boolean;
  isMember: boolean;
  isCompanyOwner: boolean;
}

const toColumn = (entity: BoardColumnEntity): BoardColumn => ({
  id: entity.id,
  name: entity.name,
  kind: entity.kind,
  position: entity.position,
});

const toProject = (entity: ProjectEntity): Project => ({
  id: entity.id,
  name: entity.name,
  description: entity.description,
  startDate: entity.startDate,
  endDate: entity.endDate,
  membersCanEditTasks: entity.membersCanEditTasks,
  attachments: entity.attachments,
  team: {
    id: entity.team.id,
    name: entity.team.name,
    companyId: entity.team.companyId,
    companySlug: entity.team.company?.slug ?? null,
    companyName: entity.team.company?.name ?? null,
  },
  manager: toUser(entity.manager),
  counts: entity.taskCounts ?? EMPTY_COUNTS,
  chatId: entity.chatId ?? null,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

@Injectable()
export class ProjectTypeormRepository extends ProjectsRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
    @InjectRepository(BoardColumnEntity)
    private readonly columns: Repository<BoardColumnEntity>,
  ) {
    super();
  }

  async create(input: CreateProjectInput, manager: EntityManager) {
    const repo = manager.getRepository(ProjectEntity);

    let id: string;
    try {
      ({ id } = await repo.save(repo.create(input)));
    } catch (error) {
      if (asUniqueViolation(error)) throw new ProjectExistsError();
      throw error;
    }

    return this.require(id, manager);
  }

  async findById(id: string, manager?: EntityManager) {
    const found = await this.repo(manager).findOne({
      where: { id },
      relations: PROJECT_RELATIONS,
    });

    if (!found) return null;

    const [withExtras] = await this.withExtras([found], manager);
    return withExtras ?? toProject(found);
  }

  async findOfUser(userId: string, teamId?: string) {
    const query = this.projects
      .createQueryBuilder('project')
      .innerJoinAndSelect('project.team', 'team')
      .innerJoin(
        TeamMemberEntity,
        'membership',
        'membership."teamId" = team."id" AND membership."userId" = :userId',
        { userId },
      )
      .innerJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('team.company', 'company')
      .orderBy('project.updatedAt', 'DESC')
      .addOrderBy('project.id', 'DESC');

    if (teamId) query.andWhere('project.teamId = :teamId', { teamId });

    return this.withExtras(await query.getMany());
  }

  async findOfTeam(teamId: string, manager?: EntityManager) {
    const found = await this.repo(manager).find({
      where: { teamId },
      relations: PROJECT_RELATIONS,
      order: { updatedAt: 'DESC', id: 'DESC' },
    });

    return this.withExtras(found, manager);
  }

  async update(id: string, input: UpdateProjectInput, manager: EntityManager) {
    try {
      await manager.getRepository(ProjectEntity).update(id, input);
    } catch (error) {
      if (asUniqueViolation(error)) throw new ProjectExistsError();
      throw error;
    }

    return this.require(id, manager);
  }

  async delete(id: string, manager: EntityManager) {
    await manager.getRepository(ProjectEntity).delete(id);
  }

  async findMembership(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<ProjectMembership> {
    const [row] = await this.repo(manager).query<MembershipRow[]>(
      `SELECT p."managerId" = $2 AS "isManager",
              EXISTS (
                SELECT 1 FROM team_members tm
                 WHERE tm."teamId" = p."teamId" AND tm."userId" = $2
              ) AS "isMember",
              EXISTS (
                SELECT 1 FROM company_members cm
                 WHERE cm."companyId" = t."companyId"
                   AND cm."userId" = $2
                   AND cm."role" = 'owner'
              ) AS "isCompanyOwner"
         FROM projects p
         JOIN teams t ON t."id" = p."teamId"
        WHERE p."id" = $1`,
      [projectId, userId],
    );

    return row ?? { isManager: false, isMember: false, isCompanyOwner: false };
  }

  async findColumns(projectId: string, manager?: EntityManager) {
    const found = await this.columnRepo(manager).find({
      where: { projectId },
      order: { position: 'ASC', name: 'ASC' },
    });

    return found.map(toColumn);
  }

  async findColumn(columnId: string, manager?: EntityManager) {
    const found = await this.columnRepo(manager).findOneBy({ id: columnId });
    return found ? { ...toColumn(found), projectId: found.projectId } : null;
  }

  async createColumn(input: CreateColumnInput, manager: EntityManager) {
    const repo = manager.getRepository(BoardColumnEntity);
    const last = await repo
      .createQueryBuilder('column')
      .select('max(column.position)', 'position')
      .where('column.projectId = :projectId', { projectId: input.projectId })
      .getRawOne<{ position: number | null }>();

    try {
      const saved = await repo.save(
        repo.create({ ...input, position: (last?.position ?? -1) + 1 }),
      );
      return toColumn(saved);
    } catch (error) {
      if (asUniqueViolation(error)) throw new ColumnExistsError();
      throw error;
    }
  }

  async updateColumn(
    columnId: string,
    input: UpdateColumnInput,
    manager: EntityManager,
  ) {
    const repo = manager.getRepository(BoardColumnEntity);

    try {
      await repo.update(columnId, input);
    } catch (error) {
      if (asUniqueViolation(error)) throw new ColumnExistsError();
      throw error;
    }

    const updated = await repo.findOneBy({ id: columnId });
    if (!updated) throw new Error(`Column ${columnId} vanished after a write`);
    return toColumn(updated);
  }

  async deleteColumn(columnId: string, manager: EntityManager) {
    await manager.getRepository(BoardColumnEntity).delete(columnId);
  }

  async setColumnOrder(
    projectId: string,
    columnIds: string[],
    manager: EntityManager,
  ) {
    await manager.query(
      `UPDATE board_columns AS c
          SET "position" = ordered."position"
         FROM unnest($2::uuid[]) WITH ORDINALITY AS ordered("id", "position")
        WHERE c."id" = ordered."id" AND c."projectId" = $1`,
      [projectId, columnIds],
    );
  }

  async moveTasks(
    projectId: string,
    from: string,
    to: string,
    manager: EntityManager,
  ) {
    await manager.query(
      `UPDATE posts SET "status" = $3 WHERE "projectId" = $1::uuid AND "status" = $2`,
      [projectId, from, to],
    );
  }

  private async withExtras(found: ProjectEntity[], manager?: EntityManager) {
    if (found.length === 0) return [];

    const ids = found.map((project) => project.id);

    const [counts, chats] = await Promise.all([
      this.taskCounts(ids, manager),
      this.chatIds(ids, manager),
    ]);

    return found.map((project) =>
      toProject(
        Object.assign(project, {
          taskCounts: counts.get(project.id) ?? EMPTY_COUNTS,
          chatId: chats.get(project.id) ?? null,
        }),
      ),
    );
  }

  private async taskCounts(ids: string[], manager?: EntityManager) {
    const rows = await this.repo(manager).query<CountRow[]>(
      `SELECT p."projectId", COALESCE(c."kind", 'todo') AS "kind", count(*)::int AS "count"
         FROM posts p
         LEFT JOIN board_columns c
           ON c."projectId" = p."projectId" AND c."name" = p."status"
        WHERE p."projectId" = ANY($1::uuid[]) AND p."type" = 'task'
        GROUP BY p."projectId", c."kind"`,
      [ids],
    );

    return rows.reduce((byProject, row) => {
      const counts = byProject.get(row.projectId) ?? { ...EMPTY_COUNTS };
      counts[row.kind] += row.count;
      counts.total += row.count;
      return byProject.set(row.projectId, counts);
    }, new Map<string, TaskCounts>());
  }

  private async chatIds(ids: string[], manager?: EntityManager) {
    const rows = await this.repo(manager).query<ChatRow[]>(
      `SELECT split_part(c."dedupeKey", ':', 2) AS "projectId", c."id" AS "chatId"
         FROM chats c
        WHERE c."dedupeKey" = ANY($1::text[])`,
      [ids.map((id) => `project:${id}`)],
    );

    return new Map(rows.map((row) => [row.projectId, row.chatId]));
  }

  private async require(id: string, manager: EntityManager) {
    const project = await this.findById(id, manager);
    if (!project) throw new Error(`Project ${id} vanished right after a write`);
    return project;
  }

  private repo(manager?: EntityManager) {
    return manager ? manager.getRepository(ProjectEntity) : this.projects;
  }

  private columnRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(BoardColumnEntity) : this.columns;
  }
}
