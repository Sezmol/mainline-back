import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsModule } from '../chats/chats.module';
import { CompaniesModule } from '../companies/companies.module';
import { BoardColumnEntity } from './infra/postgres/board-column.entity';
import { ProjectEntity } from './infra/postgres/project.entity';
import { ProjectTypeormRepository } from './infra/postgres/project.typeorm.repository';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectEntity, BoardColumnEntity]),
    CompaniesModule,
    ChatsModule,
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    { provide: ProjectsRepository, useClass: ProjectTypeormRepository },
  ],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
