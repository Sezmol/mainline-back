import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { COMPANY_ROLES } from '../../common/domain/directory';
import { publicUserSchema, toPublicUser } from '../../users/dto/user.dto';
import { TEAM_DESCRIPTION_MAX, TEAM_NAME_MAX } from '../companies.constants';
import type { Team, TeamMember } from '../teams.types';

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(TEAM_NAME_MAX, `Name must be ${TEAM_NAME_MAX} characters or fewer`),
  description: z
    .string()
    .trim()
    .max(TEAM_DESCRIPTION_MAX, 'Description is too long')
    .nullish()
    .default(null),
  companyId: z.uuid().optional(),
});

export class CreateTeamDto extends createZodDto(createTeamSchema) {}

export const updateTeamSchema = createTeamSchema.omit({ companyId: true });

export class UpdateTeamDto extends createZodDto(updateTeamSchema) {}

export const teamsQuerySchema = z.object({
  companyId: z.uuid().optional(),
});

export class TeamsQueryDto extends createZodDto(teamsQuerySchema) {}

export const teamSchema = z.object({
  id: z.string(),
  companyId: z.string().nullable(),
  companySlug: z.string().nullable(),
  companyName: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  manager: publicUserSchema,
  memberCount: z.number().int(),
  chatId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class TeamDto extends createZodDto(teamSchema) {}

export const toTeamDto = (team: Team): TeamDto => ({
  ...team,
  manager: toPublicUser(team.manager),
  createdAt: team.createdAt.toISOString(),
  updatedAt: team.updatedAt.toISOString(),
});

export const teamMemberSchema = z.object({
  user: publicUserSchema,
  companyRole: z.enum(COMPANY_ROLES).nullable(),
  departments: z.array(z.string()),
  joinedAt: z.iso.datetime(),
});

export class TeamMemberDto extends createZodDto(teamMemberSchema) {}

export const toTeamMemberDto = (member: TeamMember): TeamMemberDto => ({
  user: toPublicUser(member.user),
  companyRole: member.companyRole,
  departments: member.departments,
  joinedAt: member.joinedAt.toISOString(),
});
