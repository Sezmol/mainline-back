import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { ChatsService } from '../chats/chats.service';
import { teamAccess } from '../companies/company-access';
import { TeamsService } from '../companies/teams.service';
import type { Team } from '../companies/teams.types';
import { DEFAULT_COLUMNS } from '../common/domain/directory';
import { AppException } from '../common/errors/app.exception';
import type { User } from '../users/users.types';
import type { CreateColumnDto, UpdateColumnDto } from './dto/column.dto';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { projectAccess, type ProjectContext } from './project-access';
import { ProjectsRepository } from './projects.repository';
import {
  ColumnExistsError,
  ProjectExistsError,
  type Project,
} from './projects.types';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly teams: TeamsService,
    private readonly chats: ChatsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(actor: User, dto: CreateProjectDto) {
    const team = await this.teams.findById(dto.teamId, actor.id);
    await this.assertRunsTeam(team, actor);

    const members = await this.teams.members(team.id, actor.id);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const project = await this.projects.create(
          {
            teamId: team.id,
            managerId: actor.id,
            name: dto.name,
            description: dto.description ?? null,
            startDate: dto.startDate ?? null,
            endDate: dto.endDate ?? null,
            attachments: dto.attachments,
          },
          manager,
        );

        for (const column of DEFAULT_COLUMNS) {
          await this.projects.createColumn(
            { projectId: project.id, name: column.name, kind: column.kind },
            manager,
          );
        }

        const chat = await this.chats.ensureProjectChat(
          project,
          actor.id,
          manager,
        );

        for (const member of members) {
          await this.chats.joinGroup(chat, member.user.id, manager);
        }

        return this.require(project.id, manager);
      });
    } catch (error) {
      this.rethrowNameConflict(error);
    }
  }

  list(userId: string, teamId?: string) {
    return this.projects.findOfUser(userId, teamId);
  }

  async findById(projectId: string, viewerId: string) {
    const { project, ctx } = await this.context(projectId, viewerId);

    if (!projectAccess.view(ctx)) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(projectId: string, actor: User, dto: UpdateProjectDto) {
    const { project, ctx } = await this.openFor(projectId, actor.id);

    this.assert(
      projectAccess.edit(ctx),
      'Only the project manager edits a project',
    );

    try {
      return await this.dataSource.transaction(async (manager) => {
        const updated = await this.projects.update(
          projectId,
          {
            name: dto.name,
            description: dto.description ?? null,
            startDate: dto.startDate ?? null,
            endDate: dto.endDate ?? null,
            membersCanEditTasks: dto.membersCanEditTasks,
            attachments: dto.attachments,
          },
          manager,
        );

        if (dto.name !== project.name) {
          await this.chats.renameGroup('project', projectId, dto.name, manager);
        }

        return updated;
      });
    } catch (error) {
      this.rethrowNameConflict(error);
    }
  }

  async remove(projectId: string, actor: User) {
    const { ctx } = await this.openFor(projectId, actor.id);

    this.assert(
      projectAccess.remove(ctx),
      'Only the project manager deletes a project',
    );

    await this.dataSource.transaction(async (manager) => {
      await this.chats.deleteGroupChat('project', projectId, manager);
      await this.projects.delete(projectId, manager);
    });
  }

  async columns(projectId: string, viewerId: string) {
    await this.findById(projectId, viewerId);
    return this.projects.findColumns(projectId);
  }

  async addColumn(projectId: string, actor: User, dto: CreateColumnDto) {
    const { ctx } = await this.openFor(projectId, actor.id);
    this.assert(projectAccess.manageColumns(ctx), this.columnDenied);

    try {
      const column = await this.dataSource.transaction((manager) =>
        this.projects.createColumn(
          { projectId, name: dto.name, kind: dto.kind },
          manager,
        ),
      );

      await this.chats.boardChanged(projectId);
      return column;
    } catch (error) {
      this.rethrowColumnConflict(error);
    }
  }

  async updateColumn(columnId: string, actor: User, dto: UpdateColumnDto) {
    const column = await this.requireColumn(columnId);
    const { ctx } = await this.openFor(column.projectId, actor.id);
    this.assert(projectAccess.manageColumns(ctx), this.columnDenied);

    try {
      const updated = await this.dataSource.transaction(async (manager) => {
        if (dto.name !== column.name) {
          await this.projects.moveTasks(
            column.projectId,
            column.name,
            dto.name,
            manager,
          );
        }

        return this.projects.updateColumn(columnId, dto, manager);
      });

      await this.chats.boardChanged(column.projectId);
      return updated;
    } catch (error) {
      this.rethrowColumnConflict(error);
    }
  }

  async removeColumn(columnId: string, actor: User) {
    const column = await this.requireColumn(columnId);
    const { ctx } = await this.openFor(column.projectId, actor.id);
    this.assert(projectAccess.manageColumns(ctx), this.columnDenied);

    const columns = await this.projects.findColumns(column.projectId);
    const fallback = columns.find((other) => other.id !== columnId);

    if (!fallback) {
      throw AppException.validation('A board needs at least one column');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.projects.moveTasks(
        column.projectId,
        column.name,
        fallback.name,
        manager,
      );
      await this.projects.deleteColumn(columnId, manager);
    });

    await this.chats.boardChanged(column.projectId);
  }

  async reorderColumns(projectId: string, actor: User, columnIds: string[]) {
    const { ctx } = await this.openFor(projectId, actor.id);
    this.assert(projectAccess.manageColumns(ctx), this.columnDenied);

    const known = new Set(
      (await this.projects.findColumns(projectId)).map((column) => column.id),
    );
    const sent = new Set(columnIds);

    if (
      sent.size !== columnIds.length ||
      sent.size !== known.size ||
      columnIds.some((id) => !known.has(id))
    ) {
      throw AppException.validation('Send every column of the board once');
    }

    await this.dataSource.transaction((manager) =>
      this.projects.setColumnOrder(projectId, columnIds, manager),
    );

    await this.chats.boardChanged(projectId);
    return this.projects.findColumns(projectId);
  }

  async context(projectId: string, userId: string) {
    const project = await this.require(projectId);
    const membership = await this.projects.findMembership(projectId, userId);

    const ctx: ProjectContext = {
      userId,
      membersCanEditTasks: project.membersCanEditTasks,
      ...membership,
    };

    return { project, ctx };
  }

  async openFor(projectId: string, userId: string) {
    const { project, ctx } = await this.context(projectId, userId);
    if (!projectAccess.view(ctx)) {
      throw new NotFoundException('Project not found');
    }
    return { project, ctx };
  }

  async require(projectId: string, manager?: EntityManager) {
    const project = await this.projects.findById(projectId, manager);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async adoptTask(
    author: User,
    assignee: User,
    title: string,
    manager: EntityManager,
  ) {
    const team = await this.teams.createIn(
      author,
      { name: this.teamNameFor(title), description: null },
      manager,
    );

    await this.teams.addMemberChecked(team.id, assignee.id, manager);
    await this.chats.joinGroupChat('team', team.id, assignee.id, manager);

    const project = await this.projects.create(
      {
        teamId: team.id,
        managerId: author.id,
        name: title.slice(0, 100),
        description: null,
        startDate: null,
        endDate: null,
        attachments: [],
      },
      manager,
    );

    for (const column of DEFAULT_COLUMNS) {
      await this.projects.createColumn(
        { projectId: project.id, name: column.name, kind: column.kind },
        manager,
      );
    }

    const chat = await this.chats.ensureProjectChat(
      project,
      author.id,
      manager,
    );
    await this.chats.joinGroup(chat, author.id, manager);
    await this.chats.joinGroup(chat, assignee.id, manager);

    return project;
  }

  async joinProject(project: Project, userId: string, manager: EntityManager) {
    await this.teams.addMemberChecked(project.team.id, userId, manager);
    await this.chats.joinGroupChat('team', project.team.id, userId, manager);
    await this.chats.joinTeamProjectChats(project.team.id, userId, manager);
  }

  private readonly columnDenied =
    'Only the project manager changes the columns of a board';

  private async requireColumn(columnId: string) {
    const column = await this.projects.findColumn(columnId);
    if (!column) throw new NotFoundException('Column not found');
    return column;
  }

  private async assertRunsTeam(team: Team, actor: User) {
    const ctx = team.companyId
      ? await this.teams.context(team.companyId, actor.id)
      : null;

    this.assert(
      teamAccess.edit(ctx, team.manager.id, actor.id),
      'Only the team lead or the company owner starts a project here',
    );
  }

  private teamNameFor(title: string) {
    return `${title.slice(0, 50)} team`;
  }

  private assert(allowed: boolean, message: string) {
    if (!allowed) throw new ForbiddenException(message);
  }

  private rethrowNameConflict(error: unknown): never {
    if (error instanceof ProjectExistsError) {
      const message = 'A project with this name already exists in the team';
      throw AppException.conflict(message, { name: [message] });
    }
    throw error;
  }

  private rethrowColumnConflict(error: unknown): never {
    if (error instanceof ColumnExistsError) {
      const message = 'A column with this name already exists on the board';
      throw AppException.conflict(message, { name: [message] });
    }
    throw error;
  }
}
