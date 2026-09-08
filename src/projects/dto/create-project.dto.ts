import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const attachmentSchema = z
  .url({ protocol: /^https?$/, error: 'Enter a valid link' })
  .max(500, 'A link must be 500 characters or fewer');

const day = z.iso.date('Enter a date as YYYY-MM-DD').nullish().default(null);

export const projectFields = {
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(100, 'The name must be 100 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(20000, 'The description must be 20000 characters or fewer')
    .nullish()
    .default(null),
  startDate: day,
  endDate: day,
  attachments: z.array(attachmentSchema).max(5, 'Up to five links').default([]),
};

type Dated = { startDate: string | null; endDate: string | null };

export const endsAfterItStarts = <T extends z.ZodType<Dated>>(schema: T) =>
  schema.refine(
    ({ startDate, endDate }) =>
      startDate === null || endDate === null || startDate <= endDate,
    { message: 'The project cannot end before it starts', path: ['endDate'] },
  );

export const createProjectSchema = endsAfterItStarts(
  z.object({
    ...projectFields,
    teamId: z.uuid('Choose a team'),
  }),
);

export class CreateProjectDto extends createZodDto(createProjectSchema) {}
