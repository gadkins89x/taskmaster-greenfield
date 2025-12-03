import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = uuid();
    (request as any).requestId = requestId;

    const { method, url, body } = request;
    const userAgent = request.get('user-agent') || '';
    const tenantId = (request as any).tenantContext?.tenantId;
    const userId = (request as any).tenantContext?.userId;

    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] ${method} ${url} - Started${tenantId ? ` - Tenant: ${tenantId}` : ''}${userId ? ` - User: ${userId}` : ''}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;
          this.logger.log(
            `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          this.logger.error(
            `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
