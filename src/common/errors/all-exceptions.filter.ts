import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { AppException, type FieldErrors } from './app.exception';
import { ErrorCode } from './error-code';
import type { ErrorResponse } from './error-response';

interface ZodIssue {
  path: PropertyKey[];
  message: string;
}

const toFieldErrors = (issues: ZodIssue[]) => {
  const fields: FieldErrors = {};

  for (const issue of issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }

  return fields;
};

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: ErrorCode.UNSUPPORTED_MEDIA_TYPE,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};

const SERVER_ERROR_THRESHOLD = 500;

interface Described {
  status: number;
  code: ErrorCode;
  message: string;
  details?: FieldErrors;
}

const describe = (exception: unknown): Described => {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      message: exception.message,
      ...(exception.details ? { details: exception.details } : {}),
    };
  }

  if (exception instanceof ZodValidationException) {
    const error = exception.getZodError() as { issues?: ZodIssue[] } | null;
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Validation failed',
      details: toFieldErrors(error?.issues ?? []),
    };
  }

  if (exception instanceof ThrottlerException) {
    return {
      status: HttpStatus.TOO_MANY_REQUESTS,
      code: ErrorCode.RATE_LIMITED,
      message: 'Too many requests. Try again in a moment.',
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      code: STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL,
      message: exception.message,
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCode.INTERNAL,
    message: 'Something went wrong on our side.',
  };
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();

    const described = describe(exception);

    if (described.status >= SERVER_ERROR_THRESHOLD) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${described.status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = {
      statusCode: described.status,
      code: described.code,
      message: described.message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    if (described.details) body.details = described.details;
    if (request.id) body.requestId = request.id;

    response.status(described.status).json(body);
  }
}
