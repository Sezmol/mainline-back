import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import {
  COMPANY_ROLES,
  type CompanyRole,
} from '../../../common/domain/directory';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import { CompanyEntity } from './company.entity';

@Entity('company_members')
@Index('company_members_user_idx', ['userId'])
export class CompanyMemberEntity {
  @PrimaryColumn({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyEntity;

  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: [...COMPANY_ROLES], default: 'employee' })
  role!: CompanyRole;

  @CreateDateColumn({ type: 'timestamptz', precision: 3 })
  joinedAt!: Date;
}
