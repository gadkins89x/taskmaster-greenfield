import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';

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

export interface NotificationPayload {
  type: NotificationType;
  userId: string;
  tenantId: string;
  title: string;
  body: string;
  data?: {
    entityType?: string;
    entityId?: string;
    workOrderNumber?: string;
    itemNumber?: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
  ) {}

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Get user and their notification preferences
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          notificationPreferences: {
            where: { notificationType: payload.type },
          },
        },
      });

      if (!user) {
        this.logger.warn(`User not found for notification: ${payload.userId}`);
        return;
      }

      // Get preferences for this notification type, or use defaults
      const preferences = user.notificationPreferences[0] || {
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
      };

      // Create in-app notification if enabled
      if (preferences.inAppEnabled) {
        await this.createInAppNotification(payload);
      }

      // Send email notification if enabled
      if (preferences.emailEnabled) {
        await this.sendEmailNotification(payload, user);
      }

      // Send push notification if enabled (placeholder for future implementation)
      if (preferences.pushEnabled) {
        await this.sendPushNotification(payload, user);
      }

      this.logger.log(
        `Notification sent to user ${user.email}: ${payload.type}`,
      );
    } catch (error) {
      this.logger.error('Failed to send notification', error);
    }
  }

  async sendBulkNotification(
    payloads: NotificationPayload[],
  ): Promise<void> {
    await Promise.all(payloads.map((payload) => this.sendNotification(payload)));
  }

  private async createInAppNotification(payload: NotificationPayload): Promise<void> {
    await this.prisma.notification.create({
      data: {
        tenantId: payload.tenantId,
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data as Prisma.InputJsonValue | undefined,
        isRead: false,
      },
    });
  }

  private async sendEmailNotification(
    payload: NotificationPayload,
    user: { email: string; firstName: string; lastName: string },
  ): Promise<void> {
    let actionUrl: string | undefined;
    let actionText: string | undefined;

    // Generate action URL based on notification type
    if (payload.data?.entityType && payload.data?.entityId) {
      switch (payload.data.entityType) {
        case 'workOrder':
          actionUrl = `/work-orders/${payload.data.entityId}`;
          actionText = 'View Work Order';
          break;
        case 'inventoryItem':
          actionUrl = `/inventory/${payload.data.entityId}`;
          actionText = 'View Inventory Item';
          break;
        case 'schedule':
          actionUrl = `/scheduling/${payload.data.entityId}`;
          actionText = 'View Schedule';
          break;
        case 'asset':
          actionUrl = `/assets/${payload.data.entityId}`;
          actionText = 'View Asset';
          break;
      }
    }

    await this.emailService.sendNotificationEmail({
      recipientEmail: user.email,
      recipientName: `${user.firstName} ${user.lastName}`,
      notificationType: payload.type,
      title: payload.title,
      body: payload.body,
      actionUrl,
      actionText,
    });
  }

  private async sendPushNotification(
    payload: NotificationPayload,
    _user: { email: string },
  ): Promise<void> {
    await this.pushService.sendToUser(payload.userId, {
      title: payload.title,
      body: payload.body,
      tag: payload.type,
      data: {
        type: payload.type,
        ...payload.data,
      },
    });
  }

  // Helper methods for common notification scenarios
  async notifyWorkOrderAssigned(
    tenantId: string,
    assignedUserId: string,
    workOrderId: string,
    workOrderNumber: string,
    workOrderTitle: string,
    assignedByName: string,
  ): Promise<void> {
    await this.sendNotification({
      type: NotificationType.WORK_ORDER_ASSIGNED,
      userId: assignedUserId,
      tenantId,
      title: `Work Order Assigned: ${workOrderNumber}`,
      body: `You have been assigned to work order "${workOrderTitle}" by ${assignedByName}.`,
      data: {
        entityType: 'workOrder',
        entityId: workOrderId,
        workOrderNumber,
      },
    });
  }

  async notifyWorkOrderCompleted(
    tenantId: string,
    creatorId: string,
    workOrderId: string,
    workOrderNumber: string,
    workOrderTitle: string,
    completedByName: string,
  ): Promise<void> {
    await this.sendNotification({
      type: NotificationType.WORK_ORDER_COMPLETED,
      userId: creatorId,
      tenantId,
      title: `Work Order Completed: ${workOrderNumber}`,
      body: `Work order "${workOrderTitle}" has been completed by ${completedByName}.`,
      data: {
        entityType: 'workOrder',
        entityId: workOrderId,
        workOrderNumber,
      },
    });
  }

  async notifyWorkOrderComment(
    tenantId: string,
    notifyUserIds: string[],
    workOrderId: string,
    workOrderNumber: string,
    commenterName: string,
    commentPreview: string,
  ): Promise<void> {
    const payloads = notifyUserIds.map((userId) => ({
      type: NotificationType.WORK_ORDER_COMMENT,
      userId,
      tenantId,
      title: `New Comment on ${workOrderNumber}`,
      body: `${commenterName}: "${commentPreview.substring(0, 100)}${commentPreview.length > 100 ? '...' : ''}"`,
      data: {
        entityType: 'workOrder',
        entityId: workOrderId,
        workOrderNumber,
      },
    }));

    await this.sendBulkNotification(payloads);
  }

  async notifyLowInventory(
    tenantId: string,
    notifyUserIds: string[],
    itemId: string,
    itemNumber: string,
    itemName: string,
    currentStock: number,
    reorderPoint: number,
  ): Promise<void> {
    const payloads = notifyUserIds.map((userId) => ({
      type: NotificationType.LOW_INVENTORY_ALERT,
      userId,
      tenantId,
      title: `Low Inventory: ${itemName}`,
      body: `"${itemName}" (${itemNumber}) has fallen to ${currentStock} units, below the reorder point of ${reorderPoint}.`,
      data: {
        entityType: 'inventoryItem',
        entityId: itemId,
        itemNumber,
      },
    }));

    await this.sendBulkNotification(payloads);
  }

  async notifyScheduleDue(
    tenantId: string,
    assignedUserId: string,
    scheduleId: string,
    scheduleName: string,
    assetName: string,
    dueDate: string,
  ): Promise<void> {
    await this.sendNotification({
      type: NotificationType.SCHEDULE_DUE,
      userId: assignedUserId,
      tenantId,
      title: `Maintenance Due: ${scheduleName}`,
      body: `Scheduled maintenance for "${assetName}" is due on ${dueDate}.`,
      data: {
        entityType: 'schedule',
        entityId: scheduleId,
      },
    });
  }

  async notifyScheduleGenerated(
    tenantId: string,
    assignedUserId: string,
    scheduleId: string,
    workOrderNumber: string,
    scheduleName: string,
  ): Promise<void> {
    await this.sendNotification({
      type: NotificationType.SCHEDULE_GENERATED,
      userId: assignedUserId,
      tenantId,
      title: `New Scheduled Work Order: ${workOrderNumber}`,
      body: `A new work order has been automatically generated from schedule "${scheduleName}".`,
      data: {
        entityType: 'schedule',
        entityId: scheduleId,
        workOrderNumber,
      },
    });
  }
}
