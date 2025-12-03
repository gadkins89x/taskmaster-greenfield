import { apiClient } from './api-client';

export enum NotificationType {
  WORK_ORDER_ASSIGNED = 'work_order_assigned',
  WORK_ORDER_COMPLETED = 'work_order_completed',
  WORK_ORDER_UPDATED = 'work_order_updated',
  WORK_ORDER_COMMENT = 'work_order_comment',
  WORK_ORDER_OVERDUE = 'work_order_overdue',
  LOW_INVENTORY_ALERT = 'low_inventory_alert',
  INVENTORY_RECEIVED = 'inventory_received',
  SCHEDULE_DUE = 'schedule_due',
  SCHEDULE_GENERATED = 'schedule_generated',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    entityType?: 'workOrder' | 'inventoryItem' | 'schedule' | 'asset';
    entityId?: string;
    workOrderNumber?: string;
    itemNumber?: string;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  notificationType: NotificationType;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API functions
export async function getNotifications(params: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
} = {}): Promise<PaginatedResponse<Notification>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.unreadOnly) searchParams.set('unreadOnly', 'true');
  if (params.type) searchParams.set('type', params.type);

  const query = searchParams.toString();
  return apiClient.get(`/notifications${query ? `?${query}` : ''}`);
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return apiClient.get('/notifications/unread-count');
}

export async function markAsRead(id: string): Promise<Notification> {
  return apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<{ count: number }> {
  return apiClient.post('/notifications/mark-all-read');
}

export async function getPreferences(): Promise<NotificationPreference[]> {
  return apiClient.get('/notifications/preferences');
}

export async function updatePreference(data: {
  notificationType: NotificationType;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
}): Promise<NotificationPreference> {
  return apiClient.patch('/notifications/preferences', data);
}

// Helper to get human-readable notification type labels
export const notificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.WORK_ORDER_ASSIGNED]: 'Work Order Assigned',
  [NotificationType.WORK_ORDER_COMPLETED]: 'Work Order Completed',
  [NotificationType.WORK_ORDER_UPDATED]: 'Work Order Updated',
  [NotificationType.WORK_ORDER_COMMENT]: 'Work Order Comment',
  [NotificationType.WORK_ORDER_OVERDUE]: 'Work Order Overdue',
  [NotificationType.LOW_INVENTORY_ALERT]: 'Low Inventory Alert',
  [NotificationType.INVENTORY_RECEIVED]: 'Inventory Received',
  [NotificationType.SCHEDULE_DUE]: 'Maintenance Due',
  [NotificationType.SCHEDULE_GENERATED]: 'Maintenance Generated',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: 'System Announcement',
};

// Group notification types by category
export const notificationCategories = {
  'Work Orders': [
    NotificationType.WORK_ORDER_ASSIGNED,
    NotificationType.WORK_ORDER_COMPLETED,
    NotificationType.WORK_ORDER_UPDATED,
    NotificationType.WORK_ORDER_COMMENT,
    NotificationType.WORK_ORDER_OVERDUE,
  ],
  'Inventory': [
    NotificationType.LOW_INVENTORY_ALERT,
    NotificationType.INVENTORY_RECEIVED,
  ],
  'Scheduling': [
    NotificationType.SCHEDULE_DUE,
    NotificationType.SCHEDULE_GENERATED,
  ],
  'System': [
    NotificationType.SYSTEM_ANNOUNCEMENT,
  ],
};
