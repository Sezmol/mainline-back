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
import { CHAT_TYPES, type ChatType } from '../../../common/domain/directory';
import { PostEntity } from '../../../posts/infra/postgres/post.entity';
import { UserEntity } from '../../../users/infra/postgres/user.entity';

@Entity('chats')
@Check(
  'chats_post_link_chk',
  `("type" IN ('vacancy', 'event', 'content', 'task')) = ("postId" IS NOT NULL)`,
)
@Check(
  'chats_write_restricted_chk',
  `"type" = 'event' OR "writeRestricted" = false`,
)
@Check(
  'chats_group_title_chk',
  `("type" IN ('company', 'department', 'team', 'project')) = ("title" IS NOT NULL)`,
)
@Index('chats_last_message_at_idx', ['lastMessageAt', 'id'])
export class ChatEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: [...CHAT_TYPES] })
  type!: ChatType;

  @Column({ type: 'text', unique: true })
  dedupeKey!: string;

  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @Column({ type: 'uuid', nullable: true })
  postId!: string | null;

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'postId' })
  post!: PostEntity | null;

  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner!: UserEntity | null;

  @Column({ type: 'boolean', default: false })
  writeRestricted!: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastMessageAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
