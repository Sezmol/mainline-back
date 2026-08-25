import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { Public } from '../auth/decorators/public.decorator';
import {
  AvailabilityQueryDto,
  AvailabilityResponseDto,
} from './dto/availability.dto';
import { UsersService } from './users.service';

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
}
