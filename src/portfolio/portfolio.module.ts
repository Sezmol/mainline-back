import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioItemEntity } from './infra/postgres/portfolio-item.entity';
import { PortfolioItemTypeormRepository } from './infra/postgres/portfolio-item.typeorm.repository';
import { PortfolioController } from './portfolio.controller';
import { PortfolioRepository } from './portfolio.repository';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioItemEntity])],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    { provide: PortfolioRepository, useClass: PortfolioItemTypeormRepository },
  ],
})
export class PortfolioModule {}
