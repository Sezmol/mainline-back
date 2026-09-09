import type { CompanyRole } from '../common/domain/directory';

export interface CompanyContext {
  userId: string;
  role: CompanyRole | null;
}

const isOwner = (ctx: CompanyContext) => ctx.role === 'owner';

const isStaff = (ctx: CompanyContext) =>
  ctx.role === 'owner' || ctx.role === 'hr';

export const companyAccess = {
  read: (ctx: CompanyContext) => ctx.role !== null,
  edit: isOwner,
  invite: isStaff,
  setRole: isOwner,
  transferOwnership: isOwner,
  createDepartment: isStaff,
  editDepartment: isStaff,

  removeMember: (ctx: CompanyContext, targetRole: CompanyRole) => {
    if (targetRole === 'owner') return false;
    if (isOwner(ctx)) return true;
    return ctx.role === 'hr' && targetRole !== 'hr';
  },

  createTeam: (ctx: CompanyContext) =>
    ctx.role === 'owner' || ctx.role === 'hr' || ctx.role === 'manager',

  attachPost: (ctx: CompanyContext) => ctx.role !== null,
};

export const departmentAccess = {
  edit: (ctx: CompanyContext) => companyAccess.editDepartment(ctx),
  manageMembers: (ctx: CompanyContext, managerId: string | null) =>
    isStaff(ctx) || (managerId !== null && ctx.userId === managerId),
};

export const teamAccess = {
  view: (ctx: CompanyContext | null, managerId: string, isMember: boolean) =>
    isMember || managerId === ctx?.userId || (ctx !== null && isOwner(ctx)),
  edit: (ctx: CompanyContext | null, managerId: string, viewerId: string) =>
    managerId === viewerId || (ctx !== null && isOwner(ctx)),
  manageMembers: (viewerId: string, managerId: string) =>
    viewerId === managerId,
  remove: (ctx: CompanyContext | null, managerId: string, viewerId: string) =>
    managerId === viewerId || (ctx !== null && isOwner(ctx)),
};
