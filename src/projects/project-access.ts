import type { ProjectMembership } from './projects.types';

export interface ProjectContext extends ProjectMembership {
  userId: string;
  membersCanEditTasks: boolean;
}

const manages = (ctx: ProjectContext) => ctx.isManager || ctx.isCompanyOwner;

export const projectAccess = {
  view: (ctx: ProjectContext) => ctx.isMember || manages(ctx),
  edit: manages,
  remove: manages,
  manageColumns: manages,
  assign: manages,

  writeTasks: (ctx: ProjectContext) =>
    manages(ctx) || (ctx.isMember && ctx.membersCanEditTasks),

  moveTask: (ctx: ProjectContext, isAuthor: boolean, isAssignee: boolean) =>
    isAuthor || isAssignee || projectAccess.writeTasks(ctx),
};
