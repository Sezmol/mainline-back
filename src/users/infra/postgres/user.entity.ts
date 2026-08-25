import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ROLES,
  SPECIALITIES,
  type Role,
  type Speciality,
} from '../../../common/domain/directory';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50 })
  firstName!: string;

  @Column({ length: 50 })
  lastName!: string;

  @Column({ length: 32, unique: true })
  nickname!: string;

  @Column({ length: 254, unique: true })
  email!: string;

  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: [...SPECIALITIES] })
  speciality!: Speciality;

  @Column({ type: 'enum', enum: [...ROLES], default: 'member' })
  role!: Role;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  workplace!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
