import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  INTERACTION_KINDS,
  INTERACTION_STATUSES,
  SPECIALITIES,
  WORK_FORMATS,
} from '../../common/domain/directory';
import { namedZodDto } from '../../common/validation/zod-dto';
import { publicUserSchema } from '../../users/dto/user.dto';

const viewerInteractionSchema = z.object({
  kind: z.enum(INTERACTION_KINDS),
  status: z.enum(INTERACTION_STATUSES),
});

const commonFields = {
  id: z.string(),
  direction: z.enum(SPECIALITIES),
  title: z.string(),
  body: z.string(),
  author: publicUserSchema,
  company: z
    .object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      logoUrl: z.string().nullable(),
    })
    .nullable(),
  likeCount: z.number().int(),
  likedByMe: z.boolean(),
  savedByMe: z.boolean(),
  commentCount: z.number().int(),
  acceptedCount: z.number().int(),
  myInteraction: viewerInteractionSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};

export const postSchema = z.discriminatedUnion('type', [
  z.object({ ...commonFields, type: z.literal('content') }),
  z.object({
    ...commonFields,
    type: z.literal('vacancy'),
    location: z.string().nullable(),
    salaryMin: z.number().int().nullable(),
    salaryMax: z.number().int().nullable(),
    workFormat: z.enum(WORK_FORMATS),
  }),
  z.object({
    ...commonFields,
    type: z.literal('event'),
    location: z.string().nullable(),
    isPrivate: z.boolean(),
    participantLimit: z.number().int().nullable(),
  }),
  z.object({
    ...commonFields,
    type: z.literal('task'),
    projectId: z.string().nullable(),
    project: z.object({ id: z.string(), name: z.string() }).nullable(),
    deadline: z.iso.datetime().nullable(),
    status: z.string(),
    isPrivate: z.boolean(),
    attachments: z.array(z.string()),
    assignees: z.array(publicUserSchema),
  }),
]);

export const PostDto = namedZodDto('PostDto', postSchema);
export type PostDto = z.infer<typeof postSchema>;

export const postPageSchema = z.object({
  items: z.array(postSchema),
  nextCursor: z.string().nullable(),
});

export class PostPageDto extends createZodDto(postPageSchema) {}

export const likePageSchema = z.object({
  items: z.array(publicUserSchema),
  nextCursor: z.string().nullable(),
});

export class LikePageDto extends createZodDto(likePageSchema) {}
