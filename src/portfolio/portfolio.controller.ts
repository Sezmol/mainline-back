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
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { toPublicUser } from '../users/dto/user.dto';
import type { User } from '../users/users.types';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectDto } from './dto/project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PortfolioService } from './portfolio.service';
import type { Project } from './portfolio.types';

const toProjectDto = (project: Project): ProjectDto => ({
  id: project.id,
  title: project.title,
  ...(project.description ? { description: project.description } : {}),
  links: project.links,
  ...(project.previewUrl ? { previewUrl: project.previewUrl } : {}),
  author: toPublicUser(project.author),
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

@ApiTags('portfolio')
@Controller('users/:userId/portfolio')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Everything in a portfolio, newest first',
    description: 'Short by nature, so it comes back in one go without paging.',
  })
  @ZodResponse({ status: 200, type: [ProjectDto] })
  async list(@Param('userId', ParseUUIDPipe) userId: string) {
    const projects = await this.portfolio.list(userId);
    return projects.map(toProjectDto);
  }

  @Public()
  @Get(':projectId')
  @ApiOperation({ summary: 'A single project' })
  @ZodResponse({ status: 200, type: ProjectDto })
  async byId(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return toProjectDto(await this.portfolio.findById(userId, projectId));
  }

  @Post()
  @HttpCode(201)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Add a project, owner only' })
  @ZodResponse({ status: 201, type: ProjectDto })
  async create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateProjectDto,
  ) {
    return toProjectDto(await this.portfolio.create(userId, user.id, dto));
  }

  @Put(':projectId')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Edit a project, owner only' })
  @ZodResponse({ status: 200, type: ProjectDto })
  async update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateProjectDto,
  ) {
    return toProjectDto(
      await this.portfolio.update(userId, user.id, projectId, dto),
    );
  }

  @Delete(':projectId')
  @HttpCode(204)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Delete a project, owner only' })
  remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.portfolio.remove(userId, user.id, projectId);
  }
}
