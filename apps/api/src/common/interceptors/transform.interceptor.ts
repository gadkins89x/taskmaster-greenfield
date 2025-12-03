import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request as any).requestId || 'unknown';

    return next.handle().pipe(
      map((responseData) => {
        // If already wrapped (e.g., paginated responses), just add meta
        if (responseData && typeof responseData === 'object' && 'data' in responseData) {
          return {
            ...responseData,
            meta: {
              ...responseData.meta,
              requestId,
              timestamp: new Date().toISOString(),
            },
          };
        }

        // Wrap simple responses
        return {
          data: responseData,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
