import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import {
  INTERACTION_KINDS,
  INTERACTION_STATUSES,
  type InteractionKind,
  type InteractionStatus,
} from '../../../common/domain/directory';
import { PostEntity } from '../../../posts/infra/postgres/post.entity';
import { UserEntity } from '../../../users/infra/postgres/user.entity';

@Entity('interactions')
@Unique('interactions_post_user_uq', ['postId', 'userId'])
export class InteractionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  postId!: string;

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'postId' })
  post!: PostEntity;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: [...INTERACTION_KINDS] })
  kind!: InteractionKind;

  @Column({
    type: 'enum',
    enum: [...INTERACTION_STATUSES],
    default: 'pending',
  })
  status!: InteractionStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
