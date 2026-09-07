import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/users.types';
import { InvitesQueryDto } from './dto/create-invite.dto';
import { DecideInviteDto } from './dto/decide-invite.dto';
import { InviteDto, toInviteDto } from './dto/invite.dto';
import { InvitesService } from './invites.service';

@ApiTags('invites')
@ApiCookieAuth('access_token')
@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get()
  @ApiOperation({ summary: 'Invitations addressed to the signed-in user' })
  @ZodResponse({ status: 200, type: [InviteDto] })
  async mine(@CurrentUser() user: User, @Query() query: InvitesQueryDto) {
    const found = await this.invites.list(user.id, 'incoming', query.status);
    return found.map(toInviteDto);
  }

  @Get('sent')
  @ApiOperation({ summary: 'Invitations the user has sent' })
  @ZodResponse({ status: 200, type: [InviteDto] })
  async sent(@CurrentUser() user: User, @Query() query: InvitesQueryDto) {
    const found = await this.invites.list(user.id, 'outgoing', query.status);
    return found.map(toInviteDto);
  }

  @Put(':inviteId')
  @ApiOperation({ summary: 'Accept or decline an invitation' })
  @ZodResponse({ status: 200, type: InviteDto })
  async decide(
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @CurrentUser() user: User,
    @Body() dto: DecideInviteDto,
  ) {
    return toInviteDto(await this.invites.decide(inviteId, user, dto.decision));
  }

  @Delete(':inviteId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Withdraw an invitation you sent' })
  withdraw(
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @CurrentUser() user: User,
  ) {
    return this.invites.withdraw(inviteId, user);
  }
}
