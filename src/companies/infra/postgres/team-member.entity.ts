import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '../../../users/infra/postgres/user.entity';
import { TeamEntity } from './team.entity';

@Entity('team_members')
@Index('team_members_user_idx', ['userId'])
export class TeamMemberEntity {
  @PrimaryColumn({ type: 'uuid' })
  teamId!: string;

  @ManyToOne(() => TeamEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'teamId' })
  team!: TeamEntity;

  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;
}
