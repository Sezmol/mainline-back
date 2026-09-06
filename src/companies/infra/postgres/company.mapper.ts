import { toUser } from '../../../users/infra/postgres/user.mapper';
import type {
  Company,
  CompanyCard,
  CompanyMember,
} from '../../companies.types';
import type { CompanyMemberEntity } from './company-member.entity';
import type { CompanyEntity } from './company.entity';

export const toCompany = (entity: CompanyEntity): Company => ({
  id: entity.id,
  slug: entity.slug,
  name: entity.name,
  logoUrl: entity.logoUrl,
  description: entity.description,
  website: entity.website,
  location: entity.location,
  socialLinks: entity.socialLinks,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

export const toCompanyCard = (entity: CompanyEntity): CompanyCard => ({
  ...toCompany(entity),
  employeeCount: entity.employeeCount ?? 0,
});

export const toCompanyMember = (
  entity: CompanyMemberEntity,
): CompanyMember => ({
  user: toUser(entity.user),
  role: entity.role,
  joinedAt: entity.joinedAt,
});
