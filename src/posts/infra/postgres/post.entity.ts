import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  POST_TYPES,
  SPECIALITIES,
  WORK_FORMATS,
  type PostType,
  type Speciality,
  type WorkFormat,
} from '../../../common/domain/directory';
import { CompanyEntity } from '../../../companies/infra/postgres/company.entity';
import { ProjectEntity } from '../../../projects/infra/postgres/project.entity';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import type { ViewerInteraction } from '../../posts.types';
import { PostAssigneeEntity } from './post-assignee.entity';
import { PostLikeEntity } from './post-like.entity';

@Entity('posts')
@Index('posts_created_at_id_idx', ['createdAt', 'id'])
@Check(
  'posts_vacancy_fields_chk',
  `("type" = 'vacancy') = ("workFormat" IS NOT NULL)
   AND ("type" = 'vacancy' OR ("salaryMin" IS NULL AND "salaryMax" IS NULL))
   AND ("salaryMin" IS NULL OR "salaryMax" IS NULL OR "salaryMin" <= "salaryMax")`,
)
@Check(
  'posts_event_fields_chk',
  `("type" IN ('event', 'task')) = ("isPrivate" IS NOT NULL)
   AND ("participantLimit" IS NULL OR ("type" = 'event' AND "isPrivate" = false))`,
)
@Check(
  'posts_task_fields_chk',
  `("type" = 'task') = ("status" IS NOT NULL)
   AND ("type" = 'task' OR ("projectId" IS NULL AND "deadline" IS NULL
                            AND cardinality("attachments") = 0))`,
)
@Check(
  'posts_content_fields_chk',
  `"type" IN ('vacancy', 'event') OR "location" IS NULL`,
)
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('posts_author_id_idx')
  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'authorId' })
  author!: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => CompanyEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyEntity | null;

  @Column({ type: 'enum', enum: [...POST_TYPES], default: 'content' })
  type!: PostType;

  @Column({ type: 'enum', enum: [...SPECIALITIES] })
  direction!: Speciality;

  @Column({ length: 100 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location!: string | null;

  @Column({ type: 'int', nullable: true })
  salaryMin!: number | null;

  @Column({ type: 'int', nullable: true })
  salaryMax!: number | null;

  @Column({ type: 'enum', enum: [...WORK_FORMATS], nullable: true })
  workFormat!: WorkFormat | null;

  @Column({ type: 'boolean', nullable: true })
  isPrivate!: boolean | null;

  @Column({ type: 'int', nullable: true })
  participantLimit!: number | null;

  @Column({ type: 'uuid', nullable: true })
  projectId!: string | null;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'projectId' })
  project!: ProjectEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  deadline!: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  status!: string | null;

  @Column({ type: 'text', array: true, default: () => `'{}'` })
  attachments!: string[];

  @OneToMany(() => PostLikeEntity, (like) => like.post)
  likes!: PostLikeEntity[];

  @OneToMany(() => PostAssigneeEntity, (assignee) => assignee.post)
  assignees!: PostAssigneeEntity[];

  likeCount?: number;
  likedByViewer?: boolean;
  savedByViewer?: boolean;
  commentCount?: number;
  acceptedCount?: number;
  viewerInteraction?: ViewerInteraction | null;
  assignedUsers?: UserEntity[];
  projectName?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
