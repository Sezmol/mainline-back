import { ApiProperty } from '@nestjs/swagger';

export class HealthResponse {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ enum: ['connected', 'disconnected'], example: 'connected' })
  database!: 'connected' | 'disconnected';

  @ApiProperty({ example: 42, description: 'Uptime in seconds' })
  uptime!: number;

  @ApiProperty({ example: '2026-08-24T21:00:00.000Z' })
  timestamp!: string;
}
