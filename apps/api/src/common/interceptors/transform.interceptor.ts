import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

/** Extended Request with custom properties added by interceptors */
interface ExtendedRequest extends Request {
  requestId?: string;
}

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

/** Response that already has data wrapper */
interface WrappedResponse<T> {
  data: T;
  meta?: ApiResponse<T>['meta'];
}

/** Type guard to check if response is already wrapped */
function isWrappedResponse<T>(response: unknown): response is WrappedResponse<T> {
  return (
    response !== null &&
    typeof response === 'object' &&
    'data' in response
  );
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<ExtendedRequest>();
    const requestId = request.requestId || 'unknown';

    return next.handle().pipe(
      map((responseData: T | WrappedResponse<T>) => {
        // If already wrapped (e.g., paginated responses), just add meta
        if (isWrappedResponse<T>(responseData)) {
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
          data: responseData as T,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
