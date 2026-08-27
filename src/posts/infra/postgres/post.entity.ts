import {
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
  type PostType,
  type Speciality,
} from '../../../common/domain/directory';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import { PostLikeEntity } from './post-like.entity';

@Entity('posts')
@Index('posts_created_at_id_idx', ['createdAt', 'id'])
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('posts_author_id_idx')
  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'authorId' })
  author!: UserEntity;

  @Column({ type: 'enum', enum: [...POST_TYPES], default: 'content' })
  type!: PostType;

  @Column({ type: 'enum', enum: [...SPECIALITIES] })
  direction!: Speciality;

  @Column({ length: 100 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @OneToMany(() => PostLikeEntity, (like) => like.post)
  likes!: PostLikeEntity[];

  likeCount?: number;
  likedByViewer?: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
