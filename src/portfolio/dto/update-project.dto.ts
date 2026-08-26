import { createZodDto } from 'nestjs-zod';
import { createProjectSchema } from './create-project.dto';

export class UpdateProjectDto extends createZodDto(createProjectSchema) {}
