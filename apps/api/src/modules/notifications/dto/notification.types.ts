export enum NotificationType {
  // Work Order notifications
  WORK_ORDER_ASSIGNED = 'work_order_assigned',
  WORK_ORDER_COMPLETED = 'work_order_completed',
  WORK_ORDER_UPDATED = 'work_order_updated',
  WORK_ORDER_COMMENT = 'work_order_comment',
  WORK_ORDER_OVERDUE = 'work_order_overdue',

  // Inventory notifications
  LOW_INVENTORY_ALERT = 'low_inventory_alert',
  INVENTORY_RECEIVED = 'inventory_received',

  // Schedule notifications
  SCHEDULE_DUE = 'schedule_due',
  SCHEDULE_GENERATED = 'schedule_generated',

  // System notifications
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export interface NotificationData {
  entityType?: 'workOrder' | 'inventoryItem' | 'schedule' | 'asset';
  entityId?: string;
  workOrderNumber?: string;
  itemNumber?: string;
  additionalInfo?: Record<string, unknown>;
}
