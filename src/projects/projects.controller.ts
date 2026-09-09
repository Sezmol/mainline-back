import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/users.types';
import {
  CreateColumnDto,
  ReorderColumnsDto,
  UpdateColumnDto,
} from './dto/column.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  BoardColumnDto,
  ProjectDto,
  toBoardColumnDto,
  toProjectDto,
} from './dto/project.dto';
import { ProjectsQueryDto } from './dto/projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiCookieAuth('access_token')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Projects of every team the signed-in user is in' })
  @ZodResponse({ status: 200, type: [ProjectDto] })
  async list(@CurrentUser() user: User, @Query() query: ProjectsQueryDto) {
    return (await this.projects.list(user.id, query.teamId)).map(toProjectDto);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Start a project in a team',
    description:
      'The creator becomes its manager, the board gets three columns and the team gets a project chat.',
  })
  @ZodResponse({ status: 201, type: ProjectDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    return toProjectDto(await this.projects.create(user, dto));
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'One project with its task summary' })
  @ZodResponse({ status: 200, type: ProjectDto })
  async byId(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ) {
    return toProjectDto(await this.projects.findById(projectId, user.id));
  }

  @Put(':projectId')
  @ApiOperation({ summary: 'Edit a project' })
  @ZodResponse({ status: 200, type: ProjectDto })
  async update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateProjectDto,
  ) {
    return toProjectDto(await this.projects.update(projectId, user, dto));
  }

  @Delete(':projectId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a project with its board, tasks and chat' })
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.projects.remove(projectId, user);
  }

  @Get(':projectId/columns')
  @ApiOperation({ summary: 'Columns of the board, in order' })
  @ZodResponse({ status: 200, type: [BoardColumnDto] })
  async columns(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ) {
    return (await this.projects.columns(projectId, user.id)).map(
      toBoardColumnDto,
    );
  }

  @Post(':projectId/columns')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add a column to the board' })
  @ZodResponse({ status: 201, type: BoardColumnDto })
  async addColumn(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateColumnDto,
  ) {
    return toBoardColumnDto(
      await this.projects.addColumn(projectId, user, dto),
    );
  }

  @Put(':projectId/columns/order')
  @ApiOperation({ summary: 'Reorder the whole board at once' })
  @ZodResponse({ status: 200, type: [BoardColumnDto] })
  async reorderColumns(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
    @Body() dto: ReorderColumnsDto,
  ) {
    return (
      await this.projects.reorderColumns(projectId, user, dto.columnIds)
    ).map(toBoardColumnDto);
  }

  @Put(':projectId/columns/:columnId')
  @ApiOperation({
    summary: 'Rename a column',
    description: 'The tasks standing in it move with it, in one transaction.',
  })
  @ZodResponse({ status: 200, type: BoardColumnDto })
  async updateColumn(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateColumnDto,
  ) {
    return toBoardColumnDto(
      await this.projects.updateColumn(columnId, user, dto),
    );
  }

  @Delete(':projectId/columns/:columnId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a column',
    description: 'Its tasks move to the first column that is left.',
  })
  removeColumn(
    @Param('projectId', ParseUUIDPipe) _projectId: string,
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @CurrentUser() user: User,
  ) {
    return this.projects.removeColumn(columnId, user);
  }
}
