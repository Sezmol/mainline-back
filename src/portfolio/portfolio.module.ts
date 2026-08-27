import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from './infra/postgres/project.entity';
import { ProjectTypeormRepository } from './infra/postgres/project.typeorm.repository';
import { PortfolioController } from './portfolio.controller';
import { PortfolioRepository } from './portfolio.repository';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity])],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    { provide: PortfolioRepository, useClass: ProjectTypeormRepository },
  ],
})
export class PortfolioModule {}
