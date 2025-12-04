import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit_metadata';

export interface AuditMetadata {
  entityType: string;
  idParam?: string; // Parameter name for entity ID (default: 'id')
}

/**
 * Decorator to mark controller methods for automatic audit logging.
 *
 * @example
 * ```typescript
 * @Post()
 * @Audit({ entityType: 'WorkOrder' })
 * create(@Body() dto: CreateWorkOrderDto) {
 *   return this.workOrdersService.create(dto);
 * }
 *
 * @Patch(':id')
 * @Audit({ entityType: 'WorkOrder', idParam: 'id' })
 * update(@Param('id') id: string, @Body() dto: UpdateWorkOrderDto) {
 *   return this.workOrdersService.update(id, dto);
 * }
 * ```
 */
export const Audit = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_METADATA_KEY, metadata);
