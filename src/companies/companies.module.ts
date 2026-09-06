import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsModule } from '../chats/chats.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompaniesController } from './companies.controller';
import { CompaniesRepository } from './companies.repository';
import { CompaniesService } from './companies.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentsRepository } from './departments.repository';
import { DepartmentsService } from './departments.service';
import { CompanyMemberEntity } from './infra/postgres/company-member.entity';
import { CompanyEntity } from './infra/postgres/company.entity';
import { CompanyTypeormRepository } from './infra/postgres/company.typeorm.repository';
import { DepartmentMemberEntity } from './infra/postgres/department-member.entity';
import { DepartmentEntity } from './infra/postgres/department.entity';
import { DepartmentTypeormRepository } from './infra/postgres/department.typeorm.repository';
import { TeamMemberEntity } from './infra/postgres/team-member.entity';
import { TeamEntity } from './infra/postgres/team.entity';
import { TeamTypeormRepository } from './infra/postgres/team.typeorm.repository';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { TeamsController } from './teams.controller';
import { TeamsRepository } from './teams.repository';
import { TeamsService } from './teams.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyEntity,
      CompanyMemberEntity,
      DepartmentEntity,
      DepartmentMemberEntity,
      TeamEntity,
      TeamMemberEntity,
    ]),
    ChatsModule,
    NotificationsModule,
  ],
  controllers: [
    CompaniesController,
    MembersController,
    DepartmentsController,
    TeamsController,
  ],
  providers: [
    CompaniesService,
    MembersService,
    DepartmentsService,
    TeamsService,
    { provide: CompaniesRepository, useClass: CompanyTypeormRepository },
    { provide: DepartmentsRepository, useClass: DepartmentTypeormRepository },
    { provide: TeamsRepository, useClass: TeamTypeormRepository },
  ],
  exports: [
    CompaniesService,
    CompaniesRepository,
    DepartmentsService,
    TeamsService,
  ],
})
export class CompaniesModule {}
