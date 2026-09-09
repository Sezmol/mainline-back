import type {
  CreatePortfolioItemInput,
  PortfolioItem,
  UpdatePortfolioItemInput,
} from './portfolio.types';

export abstract class PortfolioRepository {
  abstract findByUser(userId: string): Promise<PortfolioItem[]>;
  abstract findById(id: string): Promise<PortfolioItem | null>;
  abstract create(input: CreatePortfolioItemInput): Promise<PortfolioItem>;
  abstract update(
    id: string,
    input: UpdatePortfolioItemInput,
  ): Promise<PortfolioItem>;
  abstract delete(id: string): Promise<void>;
}
