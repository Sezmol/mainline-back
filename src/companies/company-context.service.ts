import { ForbiddenException, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { CompaniesRepository } from './companies.repository';
import type { CompanyContext } from './company-access';

@Injectable()
export class CompanyContextService {
  constructor(protected readonly companies: CompaniesRepository) {}

  async context(
    companyId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<CompanyContext> {
    const membership = await this.companies.findMembership(
      companyId,
      userId,
      manager,
    );

    return { userId, role: membership?.role ?? null };
  }

  protected assert(allowed: boolean, message: string): void {
    if (!allowed) throw new ForbiddenException(message);
  }

  protected async requireMember(companyId: string, userId: string) {
    const ctx = await this.context(companyId, userId);
    if (ctx.role === null) {
      throw new ForbiddenException(
        'Only employees see the inside of a company',
      );
    }
    return ctx;
  }
}
