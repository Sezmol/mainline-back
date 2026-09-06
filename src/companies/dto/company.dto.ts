import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { COMPANY_ROLES } from '../../common/domain/directory';
import { publicUserSchema, toPublicUser } from '../../users/dto/user.dto';
import type {
  Company,
  CompanyCard,
  CompanyMember,
  CompanyPage,
} from '../companies.types';

export const companySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  socialLinks: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class CompanyDto extends createZodDto(companySchema) {}

export const toCompanyDto = (company: Company): CompanyDto => ({
  ...company,
  createdAt: company.createdAt.toISOString(),
  updatedAt: company.updatedAt.toISOString(),
});

export const companyCardSchema = companySchema.extend({
  employeeCount: z.number().int(),
});

export class CompanyCardDto extends createZodDto(companyCardSchema) {}

export const toCompanyCardDto = (company: CompanyCard): CompanyCardDto => ({
  ...toCompanyDto(company),
  employeeCount: company.employeeCount,
});

const containerRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  chatId: z.string().nullable(),
});

export const companyPageSchema = companyCardSchema.extend({
  vacancyCount: z.number().int(),
  viewer: z
    .object({
      role: z.enum(COMPANY_ROLES),
      departments: z.array(containerRefSchema),
      teams: z.array(containerRefSchema),
      companyChatId: z.string().nullable(),
    })
    .nullable(),
});

export class CompanyPageDto extends createZodDto(companyPageSchema) {}

export const toCompanyPageDto = (page: CompanyPage): CompanyPageDto => ({
  ...toCompanyCardDto(page),
  vacancyCount: page.vacancyCount,
  viewer: page.viewer,
});

export const companyListSchema = z.object({
  items: z.array(companyCardSchema),
  nextCursor: z.string().nullable(),
});

export class CompanyListDto extends createZodDto(companyListSchema) {}

export const memberSchema = z.object({
  user: publicUserSchema,
  role: z.enum(COMPANY_ROLES),
  joinedAt: z.iso.datetime(),
});

export class MemberDto extends createZodDto(memberSchema) {}

export const toMemberDto = (member: CompanyMember): MemberDto => ({
  user: toPublicUser(member.user),
  role: member.role,
  joinedAt: member.joinedAt.toISOString(),
});

export const memberListSchema = z.object({
  items: z.array(memberSchema),
  nextCursor: z.string().nullable(),
});

export class MemberListDto extends createZodDto(memberListSchema) {}
