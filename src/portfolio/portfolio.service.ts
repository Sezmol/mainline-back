import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import { PortfolioRepository } from './portfolio.repository';

@Injectable()
export class PortfolioService {
  constructor(private readonly projects: PortfolioRepository) {}

  list(userId: string) {
    return this.projects.findByUser(userId);
  }

  async findById(userId: string, projectId: string) {
    const project = await this.projects.findById(projectId);

    if (!project || project.author.id !== userId) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  create(userId: string, viewerId: string, dto: CreateProjectDto) {
    this.requireOwner(userId, viewerId);
    return this.projects.create({ userId, ...dto });
  }

  async update(
    userId: string,
    viewerId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ) {
    this.requireOwner(userId, viewerId);
    await this.findById(userId, projectId);
    return this.projects.update(projectId, dto);
  }

  async remove(userId: string, viewerId: string, projectId: string) {
    this.requireOwner(userId, viewerId);
    await this.findById(userId, projectId);
    await this.projects.delete(projectId);
  }

  private requireOwner(userId: string, viewerId: string) {
    if (userId !== viewerId) {
      throw new ForbiddenException('You can only change your own portfolio');
    }
  }
}
