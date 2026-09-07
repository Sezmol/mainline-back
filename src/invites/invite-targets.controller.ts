import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/users.types';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteDto, toInviteDto } from './dto/invite.dto';
import { InvitesService } from './invites.service';

@ApiTags('invites')
@ApiCookieAuth('access_token')
@Controller()
export class InviteTargetsController {
  constructor(private readonly invites: InvitesService) {}

  @Post('companies/:companyId/members')
  @HttpCode(201)
  @ApiOperation({ summary: 'Invite a person to the company; owner or HR' })
  @ZodResponse({ status: 201, type: InviteDto })
  async toCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateInviteDto,
  ) {
    return toInviteDto(
      await this.invites.invite({ scope: 'company', companyId }, user, dto),
    );
  }

  @Post('companies/:companyId/departments/:departmentId/members')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Invite an employee into a department; staff or its head',
  })
  @ZodResponse({ status: 201, type: InviteDto })
  async toDepartment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateInviteDto,
  ) {
    return toInviteDto(
      await this.invites.invite(
        { scope: 'department', companyId, departmentId },
        user,
        dto,
      ),
    );
  }

  @Post('teams/:teamId/members')
  @HttpCode(201)
  @ApiOperation({ summary: 'Invite a person into a team; the team lead' })
  @ZodResponse({ status: 201, type: InviteDto })
  async toTeam(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateInviteDto,
  ) {
    return toInviteDto(
      await this.invites.invite({ scope: 'team', teamId }, user, dto),
    );
  }
}
