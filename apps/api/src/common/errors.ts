import { HttpException, HttpStatus } from '@nestjs/common';

export class AppError extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    super({ error: message }, status);
  }
}

export class NotFoundError extends HttpException {
  constructor(entity: string, id?: string) {
    super(
      { error: id ? `${entity} ${id} not found` : `${entity} not found` },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ValidationError extends HttpException {
  constructor(message: string, details?: unknown) {
    super({ error: message, details }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class ExternalAPIError extends HttpException {
  constructor(service: string, message: string) {
    super(
      { error: `${service} error: ${message}` },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class UnauthorizedError extends HttpException {
  constructor(message = 'Unauthorized') {
    super({ error: message }, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenError extends HttpException {
  constructor(message = 'Forbidden') {
    super({ error: message }, HttpStatus.FORBIDDEN);
  }
}
