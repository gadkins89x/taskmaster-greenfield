import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { Request, Response } from 'express';
import { TenantContext } from '../auth/strategies/jwt.strategy';

/** Extended Request with custom properties added by guards and interceptors */
interface ExtendedRequest extends Request {
  requestId?: string;
  tenantContext?: TenantContext;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<ExtendedRequest>();
    const response = ctx.getResponse<Response>();

    const requestId = uuid();
    request.requestId = requestId;

    const { method, url } = request;
    const tenantId = request.tenantContext?.tenantId;
    const userId = request.tenantContext?.userId;

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
        error: (error: HttpException | Error) => {
          const duration = Date.now() - startTime;
          const statusCode = error instanceof HttpException ? error.getStatus() : 500;
          this.logger.error(
            `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
