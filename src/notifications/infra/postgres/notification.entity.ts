import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from '../../../common/domain/directory';
import { CompanyEntity } from '../../../companies/infra/postgres/company.entity';
import { InviteEntity } from '../../../invites/infra/postgres/invite.entity';
import { PostEntity } from '../../../posts/infra/postgres/post.entity';
import { UserEntity } from '../../../users/infra/postgres/user.entity';

@Entity('notifications')
@Index('notifications_user_created_at_id_idx', ['userId', 'createdAt', 'id'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: [...NOTIFICATION_TYPES] })
  type!: NotificationType;

  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor!: UserEntity | null;

  @Column({ type: 'uuid', nullable: true })
  postId!: string | null;

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'postId' })
  post!: PostEntity | null;

  @Column({ type: 'uuid', nullable: true })
  inviteId!: string | null;

  @ManyToOne(() => InviteEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'inviteId' })
  invite!: InviteEntity | null;

  @Column({ type: 'uuid', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => CompanyEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'companyId' })
  company!: CompanyEntity | null;

  @Column({ type: 'text', nullable: true })
  subject!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
