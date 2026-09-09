import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  COMPANY_ROLES,
  INVITE_SCOPES,
  INVITE_STATUSES,
  type CompanyRole,
  type InviteScope,
  type InviteStatus,
} from '../../../common/domain/directory';
import { CompanyEntity } from '../../../companies/infra/postgres/company.entity';
import { DepartmentEntity } from '../../../companies/infra/postgres/department.entity';
import { TeamEntity } from '../../../companies/infra/postgres/team.entity';
import { UserEntity } from '../../../users/infra/postgres/user.entity';

@Entity('invites')
@Check(
  'invites_scope_target_chk',
  `("scope" = 'company') = ("companyId" IS NOT NULL AND "departmentId" IS NULL AND "teamId" IS NULL)
   AND ("scope" = 'department') = ("departmentId" IS NOT NULL AND "teamId" IS NULL)
   AND ("scope" = 'team') = ("teamId" IS NOT NULL AND "departmentId" IS NULL)
   AND ("role" IS NULL OR "scope" = 'company')`,
)
@Index('invites_invitee_idx', ['inviteeId', 'status'])
export class InviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: [...INVITE_SCOPES] })
  scope!: InviteScope;

  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => CompanyEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyEntity | null;

  @Column({ type: 'uuid', nullable: true })
  departmentId!: string | null;

  @ManyToOne(() => DepartmentEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department!: DepartmentEntity | null;

  @Column({ type: 'uuid', nullable: true })
  teamId!: string | null;

  @ManyToOne(() => TeamEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'teamId' })
  team!: TeamEntity | null;

  @Column({ type: 'enum', enum: [...COMPANY_ROLES], nullable: true })
  role!: CompanyRole | null;

  @Column({ type: 'uuid' })
  inviterId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'inviterId' })
  inviter!: UserEntity;

  @Column({ type: 'uuid' })
  inviteeId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'inviteeId' })
  invitee!: UserEntity;

  @Column({ type: 'enum', enum: [...INVITE_STATUSES], default: 'pending' })
  status!: InviteStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;
}
