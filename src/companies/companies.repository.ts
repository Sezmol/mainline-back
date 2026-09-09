import type { EntityManager } from 'typeorm';
import type { CompanyRole } from '../common/domain/directory';
import type {
  Company,
  CompanyCard,
  CompanyMember,
  CreateCompanyInput,
  FindCompaniesQuery,
  FindMembersQuery,
  UpdateCompanyInput,
} from './companies.types';

export abstract class CompaniesRepository {
  abstract create(
    input: CreateCompanyInput,
    manager: EntityManager,
  ): Promise<Company>;

  abstract findById(
    id: string,
    manager?: EntityManager,
  ): Promise<Company | null>;
  abstract findBySlug(slug: string): Promise<Company | null>;
  abstract isSlugTaken(slug: string): Promise<boolean>;
  abstract findMany(query: FindCompaniesQuery): Promise<CompanyCard[]>;
  abstract findOfUser(userId: string): Promise<CompanyCard[]>;
  abstract update(id: string, input: UpdateCompanyInput): Promise<Company>;

  abstract readCounts(
    companyId: string,
  ): Promise<{ employees: number; vacancies: number }>;

  abstract findMembership(
    companyId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<CompanyMember | null>;
  abstract findMembers(query: FindMembersQuery): Promise<CompanyMember[]>;
  abstract addMember(
    companyId: string,
    userId: string,
    role: CompanyRole,
    manager: EntityManager,
  ): Promise<CompanyMember>;
  abstract setRole(
    companyId: string,
    userId: string,
    role: CompanyRole,
    manager: EntityManager,
  ): Promise<void>;
  abstract removeMember(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<boolean>;
}
