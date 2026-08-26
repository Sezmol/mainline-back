import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioRepository } from '../../portfolio.repository';
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from '../../portfolio.types';
import { ProjectEntity } from './project.entity';
import { toProject } from './project.mapper';

@Injectable()
export class ProjectTypeormRepository extends PortfolioRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
  ) {
    super();
  }

  async findByUser(userId: string) {
    const found = await this.projects.find({
      where: { userId },
      relations: { user: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return found.map(toProject);
  }

  async findById(id: string): Promise<Project | null> {
    const found = await this.projects.findOne({
      where: { id },
      relations: { user: true },
    });

    return found ? toProject(found) : null;
  }

  async create(input: CreateProjectInput) {
    const { id } = await this.projects.save(
      this.projects.create(this.toColumns(input)),
    );
    return this.reload(id);
  }

  async update(id: string, input: UpdateProjectInput) {
    await this.projects.update(id, this.toColumns(input));
    return this.reload(id);
  }

  async delete(id: string) {
    await this.projects.delete(id);
  }

  private toColumns<T extends UpdateProjectInput>(input: T) {
    return {
      ...input,
      description: input.description || null,
      previewUrl: input.previewUrl || null,
    };
  }

  private async reload(id: string) {
    const project = await this.findById(id);
    if (!project) throw new Error(`Project ${id} vanished right after a write`);
    return project;
  }
}
