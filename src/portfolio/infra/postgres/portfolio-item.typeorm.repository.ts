import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioRepository } from '../../portfolio.repository';
import type {
  CreatePortfolioItemInput,
  PortfolioItem,
  UpdatePortfolioItemInput,
} from '../../portfolio.types';
import { PortfolioItemEntity } from './portfolio-item.entity';
import { toPortfolioItem } from './portfolio-item.mapper';

@Injectable()
export class PortfolioItemTypeormRepository extends PortfolioRepository {
  constructor(
    @InjectRepository(PortfolioItemEntity)
    private readonly items: Repository<PortfolioItemEntity>,
  ) {
    super();
  }

  async findByUser(userId: string) {
    const found = await this.items.find({
      where: { userId },
      relations: { user: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return found.map(toPortfolioItem);
  }

  async findById(id: string): Promise<PortfolioItem | null> {
    const found = await this.items.findOne({
      where: { id },
      relations: { user: true },
    });

    return found ? toPortfolioItem(found) : null;
  }

  async create(input: CreatePortfolioItemInput) {
    const { id } = await this.items.save(
      this.items.create(this.toColumns(input)),
    );
    return this.reload(id);
  }

  async update(id: string, input: UpdatePortfolioItemInput) {
    await this.items.update(id, this.toColumns(input));
    return this.reload(id);
  }

  async delete(id: string) {
    await this.items.delete(id);
  }

  private toColumns<T extends UpdatePortfolioItemInput>(input: T) {
    return {
      ...input,
      description: input.description || null,
      previewUrl: input.previewUrl || null,
    };
  }

  private async reload(id: string) {
    const item = await this.findById(id);
    if (!item)
      throw new Error(`PortfolioItem ${id} vanished right after a write`);
    return item;
  }
}
