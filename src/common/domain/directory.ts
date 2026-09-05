export const SPECIALITIES = [
  'frontend',
  'backend',
  'qa',
  'design',
  'manager',
  'hr',
] as const;

export type Speciality = (typeof SPECIALITIES)[number];

export const ROLES = ['member', 'hr', 'manager'] as const;

export type Role = (typeof ROLES)[number];

export const roleForSpeciality = (speciality: Speciality): Role => {
  switch (speciality) {
    case 'hr':
      return 'hr';
    case 'manager':
      return 'manager';
    default:
      return 'member';
  }
};

export const POST_TYPES = ['content', 'vacancy', 'event', 'task'] as const;

export type PostType = (typeof POST_TYPES)[number];

export const WORK_FORMATS = ['onsite', 'remote', 'hybrid'] as const;

export type WorkFormat = (typeof WORK_FORMATS)[number];

export const INTERACTION_KINDS = ['response', 'invite'] as const;

export type InteractionKind = (typeof INTERACTION_KINDS)[number];

export const INTERACTION_STATUSES = [
  'pending',
  'accepted',
  'declined',
] as const;

export type InteractionStatus = (typeof INTERACTION_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'response_received',
  'response_accepted',
  'response_declined',
  'invite_received',
  'invite_accepted',
  'invite_declined',
  'company_invite_received',
  'company_invite_accepted',
  'company_invite_declined',
  'membership_removed',
  'task_assigned',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CHAT_TYPES = [
  'private',
  'vacancy',
  'event',
  'content',
  'task',
  'favorites',
  'company',
  'department',
  'team',
  'project',
] as const;

export type ChatType = (typeof CHAT_TYPES)[number];

export type GroupChatType = Extract<
  ChatType,
  'company' | 'department' | 'team' | 'project'
>;

export const COMPANY_ROLES = ['owner', 'hr', 'manager', 'employee'] as const;

export type CompanyRole = (typeof COMPANY_ROLES)[number];

export const INVITE_SCOPES = ['company', 'department', 'team'] as const;

export type InviteScope = (typeof INVITE_SCOPES)[number];

export const INVITE_STATUSES = ['pending', 'accepted', 'declined'] as const;

export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const COLUMN_KINDS = ['todo', 'doing', 'done'] as const;

export type ColumnKind = (typeof COLUMN_KINDS)[number];

export const DEFAULT_COLUMNS = [
  { name: 'To Do', kind: 'todo' },
  { name: 'In Progress', kind: 'doing' },
  { name: 'Done', kind: 'done' },
] as const satisfies readonly { name: string; kind: ColumnKind }[];

export const DEFAULT_STATUS = DEFAULT_COLUMNS[0].name;
