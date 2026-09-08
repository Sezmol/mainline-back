import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const projectsQuerySchema = z.object({
  teamId: z.uuid().optional(),
});

export class ProjectsQueryDto extends createZodDto(projectsQuerySchema) {}
