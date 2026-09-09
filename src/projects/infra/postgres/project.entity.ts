import {
  Check,
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
import { TeamEntity } from '../../../companies/infra/postgres/team.entity';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import { BoardColumnEntity } from './board-column.entity';

@Entity('projects')
@Unique('projects_team_name_uq', ['teamId', 'name'])
@Check(
  'projects_dates_chk',
  `"startDate" IS NULL OR "endDate" IS NULL OR "startDate" <= "endDate"`,
)
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  teamId!: string;

  @ManyToOne(() => TeamEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'teamId' })
  team!: TeamEntity;

  @Column({ type: 'uuid' })
  managerId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'managerId' })
  manager!: UserEntity;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'boolean', default: true })
  membersCanEditTasks!: boolean;

  @Column({ type: 'text', array: true, default: () => `'{}'` })
  attachments!: string[];

  @OneToMany(() => BoardColumnEntity, (column) => column.project)
  columns!: BoardColumnEntity[];

  taskCounts?: { total: number; todo: number; doing: number; done: number };
  chatId?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
