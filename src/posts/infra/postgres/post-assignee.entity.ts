import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import { PostEntity } from './post.entity';

@Entity('post_assignees')
@Index('post_assignees_user_id_idx', ['userId'])
export class PostAssigneeEntity {
  @PrimaryColumn({ type: 'uuid' })
  postId!: string;

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'postId' })
  post!: PostEntity;

  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
