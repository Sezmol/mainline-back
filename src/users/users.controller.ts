import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  AvailabilityQueryDto,
  AvailabilityResponseDto,
} from './dto/availability.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ProfileDto,
  SessionUserDto,
  toProfile,
  toSessionUser,
} from './dto/user.dto';
import { UsersService } from './users.service';
import type { User } from './users.types';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('availability')
  @ApiOperation({
    summary: 'Check whether a nickname or email is still free',
    description:
      'Used by the registration form while typing. The unique index remains ' +
      'the real guard, this only spares the user a failed submit.',
  })
  @ZodResponse({ status: 200, type: AvailabilityResponseDto })
  checkAvailability(@Query() query: AvailabilityQueryDto) {
    return this.usersService.checkAvailability(query);
  }

  @Public()
  @Get(':nickname')
  @ApiOperation({
    summary: 'A public profile',
    description: 'Addressed by nickname, so profile links stay readable.',
  })
  @ZodResponse({ status: 200, type: ProfileDto })
  async byNickname(@Param('nickname') nickname: string) {
    return toProfile(await this.usersService.getByNickname(nickname));
  }

  @Put(':id')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Edit a profile, owner only',
    description:
      'Replaces the profile: a field left out is cleared. The response is ' +
      'the session shape, so the signed-in user can be refreshed from it.',
  })
  @ZodResponse({ status: 200, type: SessionUserDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ) {
    return toSessionUser(await this.usersService.update(id, user.id, dto));
  }
}
