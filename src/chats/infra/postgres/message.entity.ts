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
import { PostEntity } from '../../../posts/infra/postgres/post.entity';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import { ChatEntity } from './chat.entity';

@Entity('messages')
@Index('messages_chat_created_at_id_idx', ['chatId', 'createdAt', 'id'])
@Check('messages_payload_chk', `"body" <> '' OR "postId" IS NOT NULL`)
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  chatId!: string;

  @ManyToOne(() => ChatEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'chatId' })
  chat!: ChatEntity;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'authorId' })
  author!: UserEntity;

  @Column({ type: 'text', default: '' })
  body!: string;

  @Column({ type: 'uuid', nullable: true })
  postId!: string | null;

  @ManyToOne(() => PostEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'postId' })
  post!: PostEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  editedAt!: Date | null;
}
