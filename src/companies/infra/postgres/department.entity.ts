import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import { CompanyEntity } from './company.entity';
import { DepartmentMemberEntity } from './department-member.entity';

@Entity('departments')
@Unique('departments_company_name_uq', ['companyId', 'name'])
@Unique('departments_id_company_uq', ['id', 'companyId'])
export class DepartmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => CompanyEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyEntity;

  @Column({ length: 60 })
  name!: string;

  @Column({ type: 'uuid', nullable: true })
  managerId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'managerId' })
  manager!: UserEntity | null;

  @OneToMany(() => DepartmentMemberEntity, (member) => member.department)
  members!: DepartmentMemberEntity[];

  memberCount?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
