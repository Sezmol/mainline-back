import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import type { CompanyMemberEntity } from './company-member.entity';
import { DepartmentEntity } from './department.entity';

@Entity('department_members')
@Index('department_members_company_user_idx', ['companyId', 'userId'])
export class DepartmentMemberEntity {
  @PrimaryColumn({ type: 'uuid' })
  departmentId!: string;

  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => DepartmentEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'departmentId' })
  department!: DepartmentEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;

  membership?: CompanyMemberEntity;
}
