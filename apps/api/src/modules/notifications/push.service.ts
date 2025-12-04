import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import * as webpush from 'web-push';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private isConfigured = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT', 'mailto:admin@taskmaster.app');

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.isConfigured = true;
        this.logger.log('Web Push VAPID credentials configured successfully');
      } catch (error) {
        this.logger.warn(`Failed to configure VAPID credentials: ${error}`);
      }
    } else {
      this.logger.warn('VAPID keys not configured. Push notifications will be logged only.');
    }
  }

  getVapidPublicKey(): string | null {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') || null;
  }

  async subscribe(
    userId: string,
    subscription: PushSubscriptionData,
    userAgent?: string,
  ): Promise<void> {
    // Check if subscription already exists
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      // Update existing subscription
      await this.prisma.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: {
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent,
        },
      });
      this.logger.log(`Updated push subscription for user ${userId}`);
    } else {
      // Create new subscription
      await this.prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent,
        },
      });
      this.logger.log(`Created push subscription for user ${userId}`);
    }
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
    this.logger.log('Push subscription removed');
  }

  async unsubscribeUser(userId: string): Promise<void> {
    const deleted = await this.prisma.pushSubscription.deleteMany({
      where: { userId },
    });
    this.logger.log(`Removed ${deleted.count} push subscriptions for user ${userId}`);
  }

  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No push subscriptions found for user ${userId}`);
      return;
    }

    await Promise.all(
      subscriptions.map((sub) =>
        this.sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        ),
      ),
    );
  }

  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

    await Promise.all(
      subscriptions.map((sub) =>
        this.sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        ),
      ),
    );
  }

  private async sendPushNotification(
    subscription: PushSubscriptionData,
    payload: PushNotificationPayload,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(`Push notification (not sent - not configured): ${payload.title}`);
      return;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        JSON.stringify(payload),
      );
      this.logger.debug(`Push notification sent: ${payload.title}`);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as { statusCode: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription has expired or is invalid - remove it
          await this.prisma.pushSubscription.deleteMany({
            where: { endpoint: subscription.endpoint },
          });
          this.logger.log('Removed expired/invalid push subscription');
          return;
        }
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send push notification: ${errorMessage}`);
    }
  }

  async getUserSubscriptionCount(userId: string): Promise<number> {
    return this.prisma.pushSubscription.count({
      where: { userId },
    });
  }
}
