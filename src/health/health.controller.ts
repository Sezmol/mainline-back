import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';
import { HealthResponse } from './health.response';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity' })
  @ApiOkResponse({ type: HealthResponse })
  async check(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponse> {
    const connected = await this.dataSource
      .query('select 1')
      .then(() => true)
      .catch(() => false);

    if (!connected) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: connected ? 'ok' : 'degraded',
      database: connected ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
