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
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { PortfolioItemDto } from './dto/portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { PortfolioService } from './portfolio.service';
import type { PortfolioItem } from './portfolio.types';

const toPortfolioItemDto = (item: PortfolioItem) => ({
  id: item.id,
  title: item.title,
  ...(item.description ? { description: item.description } : {}),
  links: item.links,
  ...(item.previewUrl ? { previewUrl: item.previewUrl } : {}),
  author: toPublicUser(item.author),
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
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
  @ZodResponse({ status: 200, type: [PortfolioItemDto] })
  async list(@Param('userId', ParseUUIDPipe) userId: string) {
    const items = await this.portfolio.list(userId);
    return items.map(toPortfolioItemDto);
  }

  @Public()
  @Get(':itemId')
  @ApiOperation({ summary: 'A single item' })
  @ZodResponse({ status: 200, type: PortfolioItemDto })
  async byId(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return toPortfolioItemDto(await this.portfolio.findById(userId, itemId));
  }

  @Post()
  @HttpCode(201)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Add a item, owner only' })
  @ZodResponse({ status: 201, type: PortfolioItemDto })
  async create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
    @Body() dto: CreatePortfolioItemDto,
  ) {
    return toPortfolioItemDto(
      await this.portfolio.create(userId, user.id, dto),
    );
  }

  @Put(':itemId')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Edit a item, owner only' })
  @ZodResponse({ status: 200, type: PortfolioItemDto })
  async update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdatePortfolioItemDto,
  ) {
    return toPortfolioItemDto(
      await this.portfolio.update(userId, user.id, itemId, dto),
    );
  }

  @Delete(':itemId')
  @HttpCode(204)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Delete a item, owner only' })
  remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: User,
  ) {
    return this.portfolio.remove(userId, user.id, itemId);
  }
}
