import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { publicUserSchema, toPublicUser } from '../../users/dto/user.dto';
import { DEPARTMENT_NAME_MAX } from '../companies.constants';
import type { Department } from '../departments.types';

export const createDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(
      DEPARTMENT_NAME_MAX,
      `Name must be ${DEPARTMENT_NAME_MAX} characters or fewer`,
    ),
  managerId: z.uuid().nullish().default(null),
});

export class CreateDepartmentDto extends createZodDto(createDepartmentSchema) {}

export class UpdateDepartmentDto extends createZodDto(createDepartmentSchema) {}

export const departmentSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  manager: publicUserSchema.nullable(),
  memberCount: z.number().int(),
  createdAt: z.iso.datetime(),
});

export class DepartmentDto extends createZodDto(departmentSchema) {}

export const toDepartmentDto = (department: Department) => ({
  ...department,
  manager: department.manager ? toPublicUser(department.manager) : null,
  createdAt: department.createdAt.toISOString(),
});
