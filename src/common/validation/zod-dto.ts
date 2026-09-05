import { createZodDto } from 'nestjs-zod';
import type { ZodType } from 'zod';

export const namedZodDto = <T extends ZodType>(name: string, schema: T) => {
  const dto = createZodDto(schema);
  Object.defineProperty(dto, 'name', { value: name });
  return dto;
};
