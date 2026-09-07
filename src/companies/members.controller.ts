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
import { PageQueryDto } from '../common/pagination/page-query.dto';
import type { User } from '../users/users.types';
import { MemberDto, MemberListDto, toMemberDto } from './dto/company.dto';
import { SetRoleDto, TransferDto } from './dto/member.dto';
import { MembersService } from './members.service';

@ApiTags('companies')
@ApiCookieAuth('access_token')
@Controller('companies/:companyId/members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @ApiOperation({ summary: 'Staff of the company; employees only' })
  @ZodResponse({ status: 200, type: MemberListDto })
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
    @Query() query: PageQueryDto,
  ) {
    const page = await this.members.list(companyId, user.id, query);

    return { items: page.items.map(toMemberDto), nextCursor: page.nextCursor };
  }

  @Post('transfer')
  @HttpCode(204)
  @ApiOperation({ summary: 'Hand the company over to another employee' })
  transfer(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: User,
    @Body() dto: TransferDto,
  ) {
    return this.members.transferOwnership(companyId, user, dto.userId);
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Assign a role, owner only' })
  @ZodResponse({ status: 200, type: MemberDto })
  async setRole(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
    @Body() dto: SetRoleDto,
  ) {
    return toMemberDto(
      await this.members.setRole(companyId, user, userId, dto.role),
    );
  }

  @Delete(':userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a person, or leave the company yourself' })
  remove(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ) {
    return this.members.remove(companyId, user, userId);
  }
}
