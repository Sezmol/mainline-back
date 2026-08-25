import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './infra/postgres/user.entity';
import { UserTypeormRepository } from './infra/postgres/user.typeorm.repository';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: UsersRepository, useClass: UserTypeormRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}
