import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import type { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { PortfolioRepository } from './portfolio.repository';

@Injectable()
export class PortfolioService {
  constructor(private readonly items: PortfolioRepository) {}

  list(userId: string) {
    return this.items.findByUser(userId);
  }

  async findById(userId: string, itemId: string) {
    const item = await this.items.findById(itemId);

    if (!item || item.author.id !== userId) {
      throw new NotFoundException('PortfolioItem not found');
    }

    return item;
  }

  create(userId: string, viewerId: string, dto: CreatePortfolioItemDto) {
    this.requireOwner(userId, viewerId);
    return this.items.create({ userId, ...dto });
  }

  async update(
    userId: string,
    viewerId: string,
    itemId: string,
    dto: UpdatePortfolioItemDto,
  ) {
    this.requireOwner(userId, viewerId);
    await this.findById(userId, itemId);
    return this.items.update(itemId, dto);
  }

  async remove(userId: string, viewerId: string, itemId: string) {
    this.requireOwner(userId, viewerId);
    await this.findById(userId, itemId);
    await this.items.delete(itemId);
  }

  private requireOwner(userId: string, viewerId: string) {
    if (userId !== viewerId) {
      throw new ForbiddenException('You can only change your own portfolio');
    }
  }
}
