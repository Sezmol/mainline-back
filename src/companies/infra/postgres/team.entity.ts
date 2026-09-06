import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import { CompanyEntity } from './company.entity';
import { TeamMemberEntity } from './team-member.entity';

@Entity('teams')
@Unique('teams_company_name_uq', ['companyId', 'name'])
export class TeamEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => CompanyEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyEntity | null;

  @Column({ length: 60 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid' })
  managerId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'managerId' })
  manager!: UserEntity;

  @OneToMany(() => TeamMemberEntity, (member) => member.team)
  members!: TeamMemberEntity[];

  memberCount?: number;
  chatId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
