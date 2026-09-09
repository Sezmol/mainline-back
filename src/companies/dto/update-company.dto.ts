import { createZodDto } from 'nestjs-zod';
import { createCompanySchema } from './create-company.dto';

export class UpdateCompanyDto extends createZodDto(createCompanySchema) {}
