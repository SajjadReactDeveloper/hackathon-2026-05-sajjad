import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as Record<string, unknown>)
        : { error: 'Internal server error' };

    if (status >= 500) {
      this.logger.error({ err: exception, path: request.url }, 'Unhandled exception');
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'object' ? message : { error: message }),
    });
  }
}
