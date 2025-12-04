import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { AUDIT_METADATA_KEY, AuditMetadata } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMetadata = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    // Skip if no audit metadata is set
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const tenantId = user?.tenantId;
    const userId = user?.userId;
    const ipAddress = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // Determine action based on HTTP method
    let action: 'create' | 'update' | 'delete';
    switch (method) {
      case 'POST':
        action = 'create';
        break;
      case 'PUT':
      case 'PATCH':
        action = 'update';
        break;
      case 'DELETE':
        action = 'delete';
        break;
      default:
        return next.handle();
    }

    // Get entity ID from params or will be extracted from response
    const entityIdFromParams = request.params?.id || request.params?.[auditMetadata.idParam || 'id'];

    // Capture request body for changes tracking
    const requestBody = request.body;

    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            // Extract entity ID from response if not in params (for create operations)
            const entityId = entityIdFromParams || response?.id || response?.data?.id;

            if (!tenantId || !entityId) {
              this.logger.warn(
                `Skipping audit log - missing tenantId (${tenantId}) or entityId (${entityId})`,
              );
              return;
            }

            // Determine what to log as changes
            let changes: Record<string, unknown> | null = null;

            if (action === 'create') {
              // For create, log the response data
              changes = response?.data || response;
            } else if (action === 'update') {
              // For update, log the request body (what changed)
              changes = requestBody;
            } else if (action === 'delete') {
              // For delete, optionally capture the deleted entity info
              changes = { deleted: true };
            }

            await this.prisma.auditLog.create({
              data: {
                tenantId,
                userId,
                entityType: auditMetadata.entityType,
                entityId,
                action,
                changes,
                ipAddress,
                userAgent,
              },
            });

            this.logger.debug(
              `Audit log created: ${action} ${auditMetadata.entityType} ${entityId}`,
            );
          } catch (error) {
            // Don't fail the request if audit logging fails
            this.logger.error('Failed to create audit log:', error);
          }
        },
        error: () => {
          // Don't log failed operations
        },
      }),
    );
  }
}
