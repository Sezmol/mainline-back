import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import { ChatEntity } from './chat.entity';

@Entity('chat_participants')
@Index('chat_participants_user_idx', ['userId'], {
  where: `"removedAt" IS NULL`,
})
export class ChatParticipantEntity {
  @PrimaryColumn({ type: 'uuid' })
  chatId!: string;

  @ManyToOne(() => ChatEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'chatId' })
  chat!: ChatEntity;

  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'boolean', default: true })
  canWrite!: boolean;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
  lastReadAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  removedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;
}
