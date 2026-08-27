import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from './portfolio.types';

export abstract class PortfolioRepository {
  abstract findByUser(userId: string): Promise<Project[]>;
  abstract findById(id: string): Promise<Project | null>;
  abstract create(input: CreateProjectInput): Promise<Project>;
  abstract update(id: string, input: UpdateProjectInput): Promise<Project>;
  abstract delete(id: string): Promise<void>;
}
