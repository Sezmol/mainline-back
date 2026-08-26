import { createZodDto } from 'nestjs-zod';
import { createPostSchema } from './create-post.dto';

export class UpdatePostDto extends createZodDto(createPostSchema) {}
