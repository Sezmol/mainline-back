import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import {
  COLUMN_KINDS,
  type ColumnKind,
} from '../../../common/domain/directory';
import { ProjectEntity } from './project.entity';

@Entity('board_columns')
@Unique('board_columns_project_name_uq', ['projectId', 'name'])
@Index('board_columns_project_position_idx', ['projectId', 'position'])
export class BoardColumnEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'projectId' })
  project!: ProjectEntity;

  @Column({ length: 40 })
  name!: string;

  @Column({ type: 'enum', enum: [...COLUMN_KINDS], default: 'doing' })
  kind!: ColumnKind;

  @Column({ type: 'int' })
  position!: number;
}
