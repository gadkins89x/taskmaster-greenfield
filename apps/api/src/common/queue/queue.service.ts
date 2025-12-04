import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PushNotificationJobData {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
  };
}

export interface AggregationJobData {
  type: 'daily' | 'weekly' | 'monthly';
  tenantId: string;
  date: string;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: Redis;
  private emailQueue: Queue;
  private pushQueue: Queue;
  private aggregationQueue: Queue;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });

    this.emailQueue = new Queue('email', { connection: this.connection });
    this.pushQueue = new Queue('push-notification', { connection: this.connection });
    this.aggregationQueue = new Queue('aggregation', { connection: this.connection });
  }

  async onModuleInit() {
    this.logger.log('Queue service initialized');
  }

  async onModuleDestroy() {
    await Promise.all([
      this.emailQueue.close(),
      this.pushQueue.close(),
      this.aggregationQueue.close(),
    ]);
    await this.connection.quit();
    this.logger.log('Queue service disconnected');
  }

  async addEmailJob(data: EmailJobData, options?: { delay?: number; priority?: number }) {
    const job = await this.emailQueue.add('send-email', data, {
      delay: options?.delay,
      priority: options?.priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    this.logger.debug(`Added email job ${job.id} to queue`);
    return job;
  }

  async addPushNotificationJob(data: PushNotificationJobData) {
    const job = await this.pushQueue.add('send-push', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
    });
    this.logger.debug(`Added push notification job ${job.id} to queue`);
    return job;
  }

  async addAggregationJob(data: AggregationJobData, options?: { delay?: number }) {
    const job = await this.aggregationQueue.add(`${data.type}-aggregation`, data, {
      delay: options?.delay,
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 60000, // Retry after 1 minute
      },
    });
    this.logger.debug(`Added ${data.type} aggregation job ${job.id} to queue`);
    return job;
  }

  async getQueueStats() {
    const [emailCounts, pushCounts, aggregationCounts] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.pushQueue.getJobCounts(),
      this.aggregationQueue.getJobCounts(),
    ]);

    return {
      email: emailCounts,
      pushNotification: pushCounts,
      aggregation: aggregationCounts,
    };
  }
}
