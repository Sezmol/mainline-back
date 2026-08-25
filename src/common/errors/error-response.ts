import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from './error-code';

export class ErrorResponse {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({ enum: Object.values(ErrorCode), example: ErrorCode.CONFLICT })
  code!: ErrorCode;

  @ApiProperty({ example: 'Nickname is already taken' })
  message!: string;

  @ApiPropertyOptional({
    description: 'Form field errors, keyed by field name.',
    example: { nickname: ['Nickname is already taken'] },
    additionalProperties: { type: 'array', items: { type: 'string' } },
  })
  details?: Record<string, string[]>;

  @ApiProperty({ example: '/api/auth/register' })
  path!: string;

  @ApiProperty({ example: '2026-08-24T21:00:00.000Z' })
  timestamp!: string;

  @ApiPropertyOptional({ example: 'c0ffee00-1234-5678-9abc-def012345678' })
  requestId?: string;
}
