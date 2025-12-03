import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import {
  CreateNotificationDto,
  BulkNotificationDto,
  UpdateNotificationPreferenceDto,
  NotificationType,
} from './dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a notification for a specific user
   */
  async create(tenantId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        data: dto.data ?? null,
        isRead: false,
      },
    });

    return notification;
  }

  /**
   * Create notifications for multiple users (bulk)
   */
  async createBulk(tenantId: string, dto: BulkNotificationDto) {
    const notifications = await this.prisma.notification.createMany({
      data: dto.userIds.map((userId) => ({
        tenantId,
        userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        data: dto.data ?? null,
        isRead: false,
      })),
    });

    return { created: notifications.count };
  }

  /**
   * Get all notifications for current user
   */
  async findAll(
    ctx: TenantContext,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    } = {},
  ) {
    const { page = 1, limit = 20, unreadOnly, type } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: n.isRead,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount: await this.getUnreadCount(ctx),
      },
    };
  }

  /**
   * Get unread notification count for current user
   */
  async getUnreadCount(ctx: TenantContext): Promise<number> {
    return this.prisma.notification.count({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(ctx: TenantContext, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark multiple notifications as read
   */
  async markManyAsRead(ctx: TenantContext, notificationIds: string[]) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(ctx: TenantContext) {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  /**
   * Delete a notification
   */
  async delete(ctx: TenantContext, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id } });

    return { success: true };
  }

  /**
   * Delete all read notifications older than specified days
   */
  async deleteOldNotifications(ctx: TenantContext, olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.notification.deleteMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isRead: true,
        createdAt: { lt: cutoffDate },
      },
    });

    return { deleted: result.count };
  }

  // ============================================================================
  // Notification Preferences
  // ============================================================================

  /**
   * Get notification preferences for current user
   */
  async getPreferences(ctx: TenantContext) {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId: ctx.userId },
    });

    // Return default preferences for all notification types
    const allTypes = Object.values(NotificationType);
    const prefsMap = new Map(preferences.map((p) => [p.notificationType, p]));

    return allTypes.map((type) => {
      const pref = prefsMap.get(type);
      return {
        notificationType: type,
        emailEnabled: pref?.emailEnabled ?? true,
        pushEnabled: pref?.pushEnabled ?? true,
        inAppEnabled: pref?.inAppEnabled ?? true,
      };
    });
  }

  /**
   * Update a notification preference
   */
  async updatePreference(ctx: TenantContext, dto: UpdateNotificationPreferenceDto) {
    const preference = await this.prisma.notificationPreference.upsert({
      where: {
        userId_notificationType: {
          userId: ctx.userId,
          notificationType: dto.notificationType,
        },
      },
      create: {
        userId: ctx.userId,
        notificationType: dto.notificationType,
        emailEnabled: dto.emailEnabled ?? true,
        pushEnabled: dto.pushEnabled ?? true,
        inAppEnabled: dto.inAppEnabled ?? true,
      },
      update: {
        emailEnabled: dto.emailEnabled,
        pushEnabled: dto.pushEnabled,
        inAppEnabled: dto.inAppEnabled,
      },
    });

    return preference;
  }

  /**
   * Check if user has a specific notification channel enabled
   */
  async isChannelEnabled(
    userId: string,
    notificationType: NotificationType,
    channel: 'email' | 'push' | 'inApp',
  ): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId,
          notificationType,
        },
      },
    });

    // Default to enabled if no preference exists
    if (!pref) return true;

    switch (channel) {
      case 'email':
        return pref.emailEnabled;
      case 'push':
        return pref.pushEnabled;
      case 'inApp':
        return pref.inAppEnabled;
    }
  }

  // ============================================================================
  // Trigger notifications (for use by other services)
  // ============================================================================

  /**
   * Notify user when work order is assigned to them
   */
  async notifyWorkOrderAssigned(
    tenantId: string,
    assigneeId: string,
    workOrderId: string,
    workOrderNumber: string,
    workOrderTitle: string,
  ) {
    const isEnabled = await this.isChannelEnabled(
      assigneeId,
      NotificationType.WORK_ORDER_ASSIGNED,
      'inApp',
    );

    if (!isEnabled) return null;

    return this.create(tenantId, {
      userId: assigneeId,
      type: NotificationType.WORK_ORDER_ASSIGNED,
      title: 'Work Order Assigned',
      body: `You have been assigned to work order ${workOrderNumber}: ${workOrderTitle}`,
      data: {
        entityType: 'workOrder',
        entityId: workOrderId,
        workOrderNumber,
      },
    });
  }

  /**
   * Notify requester when work order is completed
   */
  async notifyWorkOrderCompleted(
    tenantId: string,
    requesterId: string,
    workOrderId: string,
    workOrderNumber: string,
    workOrderTitle: string,
  ) {
    const isEnabled = await this.isChannelEnabled(
      requesterId,
      NotificationType.WORK_ORDER_COMPLETED,
      'inApp',
    );

    if (!isEnabled) return null;

    return this.create(tenantId, {
      userId: requesterId,
      type: NotificationType.WORK_ORDER_COMPLETED,
      title: 'Work Order Completed',
      body: `Work order ${workOrderNumber}: ${workOrderTitle} has been completed`,
      data: {
        entityType: 'workOrder',
        entityId: workOrderId,
        workOrderNumber,
      },
    });
  }

  /**
   * Notify when a comment is added to a work order
   */
  async notifyWorkOrderComment(
    tenantId: string,
    recipientId: string,
    commenterId: string,
    commenterName: string,
    workOrderId: string,
    workOrderNumber: string,
  ) {
    // Don't notify the commenter themselves
    if (recipientId === commenterId) return null;

    const isEnabled = await this.isChannelEnabled(
      recipientId,
      NotificationType.WORK_ORDER_COMMENT,
      'inApp',
    );

    if (!isEnabled) return null;

    return this.create(tenantId, {
      userId: recipientId,
      type: NotificationType.WORK_ORDER_COMMENT,
      title: 'New Comment',
      body: `${commenterName} commented on work order ${workOrderNumber}`,
      data: {
        entityType: 'workOrder',
        entityId: workOrderId,
        workOrderNumber,
      },
    });
  }

  /**
   * Notify admins about low inventory
   */
  async notifyLowInventory(
    tenantId: string,
    adminIds: string[],
    itemId: string,
    itemNumber: string,
    itemName: string,
    currentStock: number,
    reorderPoint: number,
  ) {
    const notifications = await Promise.all(
      adminIds.map(async (adminId) => {
        const isEnabled = await this.isChannelEnabled(
          adminId,
          NotificationType.LOW_INVENTORY_ALERT,
          'inApp',
        );

        if (!isEnabled) return null;

        return this.create(tenantId, {
          userId: adminId,
          type: NotificationType.LOW_INVENTORY_ALERT,
          title: 'Low Inventory Alert',
          body: `${itemName} (${itemNumber}) is low on stock. Current: ${currentStock}, Reorder point: ${reorderPoint}`,
          data: {
            entityType: 'inventoryItem',
            entityId: itemId,
            itemNumber,
            currentStock,
            reorderPoint,
          },
        });
      }),
    );

    return notifications.filter(Boolean);
  }

  /**
   * Notify assignee about upcoming scheduled maintenance
   */
  async notifyScheduleDue(
    tenantId: string,
    assigneeId: string,
    scheduleId: string,
    scheduleName: string,
    dueDate: Date,
  ) {
    const isEnabled = await this.isChannelEnabled(
      assigneeId,
      NotificationType.SCHEDULE_DUE,
      'inApp',
    );

    if (!isEnabled) return null;

    return this.create(tenantId, {
      userId: assigneeId,
      type: NotificationType.SCHEDULE_DUE,
      title: 'Scheduled Maintenance Due',
      body: `${scheduleName} is due on ${dueDate.toLocaleDateString()}`,
      data: {
        entityType: 'schedule',
        entityId: scheduleId,
        dueDate: dueDate.toISOString(),
      },
    });
  }
}
