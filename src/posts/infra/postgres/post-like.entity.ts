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

@Entity('likes')
@Index('likes_post_created_at_user_id_idx', ['postId', 'createdAt', 'userId'])
export class PostLikeEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid' })
  postId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @ManyToOne(() => PostEntity, (post) => post.likes, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'postId' })
  post!: PostEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
