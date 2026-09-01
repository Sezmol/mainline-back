import { z } from 'zod';
import { SPECIALITIES, WORK_FORMATS } from '../../common/domain/directory';
import { namedZodDto } from '../../common/validation/zod-dto';

const commonFields = {
  direction: z.enum(SPECIALITIES),
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title')
    .max(100, 'Title must be 100 characters or fewer'),
  body: z
    .string()
    .trim()
    .min(1, 'Write something')
    .max(20000, 'A post must be 20000 characters or fewer'),
  companyId: z.uuid().nullish().default(null),
};

const location = z
  .string()
  .trim()
  .min(1, 'Enter a location or leave the field out')
  .max(120, 'Location must be 120 characters or fewer')
  .nullish()
  .default(null);

const salary = z
  .int('Salary must be a whole number')
  .min(0, 'Salary cannot be negative')
  .max(100_000_000, 'That salary looks too large')
  .nullish()
  .default(null);

const contentSchema = z.strictObject({
  ...commonFields,
  type: z.literal('content'),
});

const vacancySchema = z
  .strictObject({
    ...commonFields,
    type: z.literal('vacancy'),
    location,
    salaryMin: salary,
    salaryMax: salary,
    workFormat: z.enum(WORK_FORMATS, 'Choose a work format'),
  })
  .refine(
    ({ salaryMin, salaryMax }) =>
      salaryMin === null || salaryMax === null || salaryMin <= salaryMax,
    {
      message: 'The lower bound cannot be above the upper one',
      path: ['salaryMin'],
    },
  );

const eventSchema = z
  .strictObject({
    ...commonFields,
    type: z.literal('event'),
    location,
    isPrivate: z.boolean(),
    participantLimit: z
      .int('The limit must be a whole number')
      .min(2, 'An event needs room for at least two')
      .max(100_000, 'That limit looks too large')
      .nullish()
      .default(null),
  })
  .refine(
    ({ isPrivate, participantLimit }) =>
      !isPrivate || participantLimit === null,
    {
      message: 'A private event runs on invitations, so it takes no limit',
      path: ['participantLimit'],
    },
  );

const taskSchema = z.strictObject({
  ...commonFields,
  type: z.literal('task'),
  projectId: z.uuid().nullish().default(null),
  deadline: z.iso.datetime().nullish().default(null),
  status: z
    .string()
    .trim()
    .min(1, 'Choose a column')
    .max(40, 'A column name is 40 characters or fewer'),
  isPrivate: z.boolean().default(true),
  attachments: z
    .array(
      z
        .url({ protocol: /^https?$/, error: 'Enter a valid link' })
        .max(500, 'A link must be 500 characters or fewer'),
    )
    .max(5, 'Up to five links')
    .default([]),
});

export const createPostSchema = z.discriminatedUnion('type', [
  contentSchema,
  vacancySchema,
  eventSchema,
  taskSchema,
]);

export const CreatePostDto = namedZodDto('CreatePostDto', createPostSchema);
export type CreatePostDto = z.infer<typeof createPostSchema>;
