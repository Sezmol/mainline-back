import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const archiveChatSchema = z.object({ archived: z.boolean() });

export class ArchiveChatDto extends createZodDto(archiveChatSchema) {}

export const chatSettingsSchema = z.object({ writeRestricted: z.boolean() });

export class ChatSettingsDto extends createZodDto(chatSettingsSchema) {}

export const participantWriteSchema = z.object({ canWrite: z.boolean() });

export class ParticipantWriteDto extends createZodDto(participantWriteSchema) {}
