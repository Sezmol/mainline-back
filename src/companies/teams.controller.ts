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
  CreateTeamDto,
  TeamDto,
  TeamMemberDto,
  TeamsQueryDto,
  UpdateTeamDto,
  toTeamDto,
  toTeamMemberDto,
} from './dto/team.dto';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiCookieAuth('access_token')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Teams the signed-in user is in' })
  @ZodResponse({ status: 200, type: [TeamDto] })
  async list(@CurrentUser() user: User, @Query() query: TeamsQueryDto) {
    return (await this.teams.list(user.id, query.companyId)).map(toTeamDto);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a team',
    description:
      'Without companyId the team is independent and anybody may create it.',
  })
  @ZodResponse({ status: 201, type: TeamDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateTeamDto) {
    return toTeamDto(await this.teams.create(user, dto));
  }

  @Get(':teamId')
  @ApiOperation({ summary: 'One team; members and the company owner only' })
  @ZodResponse({ status: 200, type: TeamDto })
  async byId(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @CurrentUser() user: User,
  ) {
    return toTeamDto(await this.teams.findById(teamId, user.id));
  }

  @Put(':teamId')
  @ApiOperation({ summary: 'Rename a team or change its description' })
  @ZodResponse({ status: 200, type: TeamDto })
  async update(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTeamDto,
  ) {
    return toTeamDto(await this.teams.update(teamId, user, dto));
  }

  @Delete(':teamId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Disband a team together with its chat' })
  remove(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @CurrentUser() user: User,
  ) {
    return this.teams.remove(teamId, user);
  }

  @Get(':teamId/members')
  @ApiOperation({ summary: 'People in the team, with role and departments' })
  @ZodResponse({ status: 200, type: [TeamMemberDto] })
  async members(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @CurrentUser() user: User,
  ) {
    return (await this.teams.members(teamId, user.id)).map(toTeamMemberDto);
  }

  @Delete(':teamId/members/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove somebody, or leave the team' })
  removeMember(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ) {
    return this.teams.removeMember(teamId, user, userId);
  }
}
