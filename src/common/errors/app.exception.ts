import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code';

export type FieldErrors = Record<string, string[]>;

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    readonly details?: FieldErrors,
  ) {
    super(message, status);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppException(
      ErrorCode.UNAUTHORIZED,
      message,
      HttpStatus.UNAUTHORIZED,
    );
  }

  static conflict(message: string, details?: FieldErrors) {
    return new AppException(
      ErrorCode.CONFLICT,
      message,
      HttpStatus.CONFLICT,
      details,
    );
  }
}
