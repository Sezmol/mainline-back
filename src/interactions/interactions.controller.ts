import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toPublicUser } from '../users/dto/user.dto';
import type { User } from '../users/users.types';
import { InteractDto } from './dto/interact.dto';
import { InteractionDto } from './dto/interaction.dto';
import { InteractionsService } from './interactions.service';
import type { Interaction } from './interactions.types';

const toInteractionDto = (interaction: Interaction) => ({
  id: interaction.id,
  postId: interaction.postId,
  kind: interaction.kind,
  status: interaction.status,
  user: toPublicUser(interaction.user),
  createdAt: interaction.createdAt.toISOString(),
  updatedAt: interaction.updatedAt.toISOString(),
});

@ApiTags('interactions')
@ApiCookieAuth('access_token')
@Controller('posts/:id')
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Get('interactions')
  @ApiOperation({
    summary: 'Who responded to a post or was invited, author only',
    description: 'Newest first. Short by nature, so it comes back in one go.',
  })
  @ZodResponse({ status: 200, type: [InteractionDto] })
  async list(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const items = await this.interactions.list(id, user.id);
    return items.map(toInteractionDto);
  }

  @Post('interact')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Respond, invite, accept or decline',
    description:
      'Responding to a vacancy waits for the author, responding to a public ' +
      'event takes a seat at once. An invitation is answered by the person ' +
      'who got it, a response by the author of the post.',
  })
  @ZodResponse({ status: 200, type: InteractionDto })
  async interact(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: InteractDto,
  ) {
    return toInteractionDto(await this.interactions.interact(id, user, dto));
  }
}
