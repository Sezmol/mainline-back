import type {
  CompanyRole,
  InviteScope,
  InviteStatus,
} from '../common/domain/directory';
import type { User } from '../users/users.types';

export interface InviteTargetView {
  id: string;
  name: string;
  companySlug: string | null;
}

export interface Invite {
  id: string;
  scope: InviteScope;
  status: InviteStatus;
  role: CompanyRole | null;
  companyId: string | null;
  departmentId: string | null;
  teamId: string | null;
  inviter: User;
  invitee: User;
  target: InviteTargetView;
  createdAt: Date;
  decidedAt: Date | null;
}

export type InviteTarget =
  | { scope: 'company'; companyId: string }
  | { scope: 'department'; companyId: string; departmentId: string }
  | { scope: 'team'; teamId: string };

export interface CreateInviteInput {
  scope: InviteScope;
  companyId: string | null;
  departmentId: string | null;
  teamId: string | null;
  role: CompanyRole | null;
  inviterId: string;
  inviteeId: string;
}

export interface FindInvitesQuery {
  userId: string;
  direction: 'incoming' | 'outgoing';
  status?: InviteStatus;
}

export class InviteExistsError extends Error {
  constructor() {
    super('An invitation is already pending');
    this.name = 'InviteExistsError';
  }
}
