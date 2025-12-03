import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).requestId || uuid();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        message = res.message || message;
        error = res.error || exception.name;
        details = res.details;

        // Handle class-validator errors
        if (Array.isArray(res.message)) {
          details = res.message.map((msg: string) => {
            const [field, ...rest] = msg.split(' ');
            return { field: field || 'unknown', message: msg };
          });
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma errors
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          message = 'A record with this value already exists';
          const target = (exception.meta?.target as string[]) || [];
          if (target.length > 0) {
            details = target.map((field) => ({
              field,
              message: `${field} must be unique`,
            }));
          }
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = 'Record not found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'Foreign key constraint failed';
          break;
        default:
          this.logger.error(`Prisma error: ${exception.code}`, exception.stack);
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message = 'Invalid data provided';
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    // Log error
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} - ${status} - ${message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
