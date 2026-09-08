import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { COLUMN_KINDS } from '../../common/domain/directory';
import { publicUserSchema, toPublicUser } from '../../users/dto/user.dto';
import type { BoardColumn, Project } from '../projects.types';

export const boardColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(COLUMN_KINDS),
  position: z.number().int(),
});

export class BoardColumnDto extends createZodDto(boardColumnSchema) {}

export const taskCountsSchema = z.object({
  total: z.number().int(),
  todo: z.number().int(),
  doing: z.number().int(),
  done: z.number().int(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  membersCanEditTasks: z.boolean(),
  attachments: z.array(z.string()),
  team: z.object({
    id: z.string(),
    name: z.string(),
    companyId: z.string().nullable(),
    companySlug: z.string().nullable(),
    companyName: z.string().nullable(),
  }),
  manager: publicUserSchema,
  counts: taskCountsSchema,
  chatId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class ProjectDto extends createZodDto(projectSchema) {}

export const toProjectDto = (project: Project): ProjectDto => ({
  ...project,
  manager: toPublicUser(project.manager),
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});

export const toBoardColumnDto = (column: BoardColumn): BoardColumnDto => column;
