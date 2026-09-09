import type { EntityManager } from 'typeorm';
import type { CompanyMember, ContainerRef } from './companies.types';
import type {
  CreateDepartmentInput,
  Department,
  UpdateDepartmentInput,
} from './departments.types';

export abstract class DepartmentsRepository {
  abstract create(
    input: CreateDepartmentInput,
    manager: EntityManager,
  ): Promise<Department>;

  abstract findById(
    id: string,
    manager?: EntityManager,
  ): Promise<Department | null>;

  abstract findByCompany(companyId: string): Promise<Department[]>;

  abstract findOfMember(
    companyId: string,
    userId: string,
  ): Promise<ContainerRef[]>;

  abstract update(
    id: string,
    input: UpdateDepartmentInput,
    manager: EntityManager,
  ): Promise<Department>;
  abstract delete(id: string, manager: EntityManager): Promise<void>;

  abstract clearManager(
    companyId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<void>;

  abstract findMembers(departmentId: string): Promise<CompanyMember[]>;
  abstract isMember(
    departmentId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<boolean>;

  abstract addMember(
    department: Department,
    userId: string,
    manager: EntityManager,
  ): Promise<void>;
  abstract removeMember(
    departmentId: string,
    userId: string,
    manager: EntityManager,
  ): Promise<boolean>;
}
