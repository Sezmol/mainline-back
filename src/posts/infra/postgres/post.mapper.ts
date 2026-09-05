import { toUser } from '../../../users/infra/postgres/user.mapper';
import type { Post, PostView } from '../../posts.types';
import type { PostEntity } from './post.entity';

const toDetails = (entity: PostEntity): PostView => {
  const common = {
    direction: entity.direction,
    title: entity.title,
    body: entity.body,
  };

  switch (entity.type) {
    case 'vacancy':
      if (!entity.workFormat) {
        throw new Error(`Vacancy ${entity.id} has no work format`);
      }

      return {
        ...common,
        type: entity.type,
        location: entity.location,
        salaryMin: entity.salaryMin,
        salaryMax: entity.salaryMax,
        workFormat: entity.workFormat,
      };

    case 'event':
      if (entity.isPrivate === null) {
        throw new Error(`Event ${entity.id} has no privacy flag`);
      }

      return {
        ...common,
        type: entity.type,
        location: entity.location,
        isPrivate: entity.isPrivate,
        participantLimit: entity.participantLimit,
      };

    case 'task':
      if (entity.isPrivate === null || entity.status === null) {
        throw new Error(`Task ${entity.id} has no status or privacy flag`);
      }

      return {
        ...common,
        type: entity.type,
        projectId: entity.projectId,
        deadline: entity.deadline,
        status: entity.status,
        isPrivate: entity.isPrivate,
        attachments: entity.attachments,
        assignees: (entity.assignedUsers ?? []).map(toUser),
        project:
          entity.projectId && entity.projectName
            ? { id: entity.projectId, name: entity.projectName }
            : null,
      };

    case 'content':
      return { ...common, type: entity.type };
  }
};

export const toPost = (entity: PostEntity): Post => ({
  ...toDetails(entity),
  id: entity.id,
  author: toUser(entity.author),
  company: entity.company
    ? {
        id: entity.company.id,
        slug: entity.company.slug,
        name: entity.company.name,
        logoUrl: entity.company.logoUrl,
      }
    : null,
  likeCount: entity.likeCount ?? 0,
  likedByMe: entity.likedByViewer ?? false,
  savedByMe: entity.savedByViewer ?? false,
  commentCount: entity.commentCount ?? 0,
  acceptedCount: entity.acceptedCount ?? 0,
  myInteraction: entity.viewerInteraction ?? null,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
