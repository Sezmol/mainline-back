import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { endsAfterItStarts, projectFields } from './create-project.dto';

export const updateProjectSchema = endsAfterItStarts(
  z.object({ ...projectFields, membersCanEditTasks: z.boolean() }),
);

export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
