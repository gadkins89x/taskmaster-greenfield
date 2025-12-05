import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { z } from 'zod';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { configSchema } from './common/config/config.schema';
import nodemailer from 'nodemailer';
import webPush from 'web-push';
import pino from 'pino';

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});

// Load and validate environment
const env = configSchema.parse(process.env);

// Redis connection for BullMQ
const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Prisma client for database operations
const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Job payload schemas
const EmailJobSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
  text: z.string().optional(),
});

const PushNotificationJobSchema = z.object({
  subscription: z.object({
    endpoint: z.string(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  payload: z.object({
    title: z.string(),
    body: z.string(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    data: z.record(z.unknown()).optional(),
  }),
});

const AggregationJobSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly']),
  tenantId: z.string().uuid(),
  date: z.string(),
});

// Email transporter (lazy initialization)
let emailTransporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  if (emailTransporter) return emailTransporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    emailTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    return emailTransporter;
  }

  return null;
}

// Configure web-push (VAPID keys should be in env)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@taskmaster.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// Job processors
async function processEmailJob(job: Job): Promise<void> {
  const data = EmailJobSchema.parse(job.data);

  const transporter = getEmailTransporter();
  if (!transporter) {
    logger.info({ to: data.to }, 'Skipping email - no SMTP configured');
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM || 'noreply@taskmaster.local',
    to: data.to,
    subject: data.subject,
    html: data.html,
    text: data.text,
  });

  logger.info({ to: data.to, subject: data.subject }, 'Email sent successfully');
}

async function processPushNotificationJob(job: Job): Promise<void> {
  const data = PushNotificationJobSchema.parse(job.data);

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    logger.info('Skipping push notification - no VAPID keys configured');
    return;
  }

  try {
    await webPush.sendNotification(
      {
        endpoint: data.subscription.endpoint,
        keys: {
          p256dh: data.subscription.keys.p256dh,
          auth: data.subscription.keys.auth,
        },
      },
      JSON.stringify(data.payload),
    );
    logger.info({ title: data.payload.title }, 'Push notification sent');
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 410) {
      // Subscription expired, should be removed from database
      logger.warn({ endpoint: data.subscription.endpoint }, 'Push subscription expired');
      throw new Error('SUBSCRIPTION_EXPIRED');
    }
    throw error;
  }
}

async function processAggregationJob(job: Job): Promise<void> {
  const data = AggregationJobSchema.parse(job.data);

  logger.info({ type: data.type, tenantId: data.tenantId }, 'Processing aggregation job');

  const { tenantId, type, date } = data;
  const targetDate = new Date(date);

  // Calculate date range based on aggregation type
  let startDate: Date;
  let endDate: Date;

  switch (type) {
    case 'daily':
      startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
  }

  // Aggregate work order metrics
  const workOrderStats = await prisma.workOrder.groupBy({
    by: ['status'],
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    },
    _count: { id: true },
  });

  const completedWorkOrders = await prisma.workOrder.findMany({
    where: {
      tenantId,
      status: 'completed',
      completedAt: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      createdAt: true,
      completedAt: true,
      actualHours: true,
      estimatedHours: true,
    },
  });

  // Calculate completion metrics
  const totalCompleted = completedWorkOrders.length;
  const totalActualHours = completedWorkOrders.reduce((sum, wo) => sum + (wo.actualHours || 0), 0);
  const totalEstimatedHours = completedWorkOrders.reduce((sum, wo) => sum + (wo.estimatedHours || 0), 0);

  // Calculate average completion time (in hours)
  let avgCompletionTime = 0;
  if (totalCompleted > 0) {
    const completionTimes = completedWorkOrders
      .filter(wo => wo.completedAt && wo.createdAt)
      .map(wo => {
        const created = new Date(wo.createdAt).getTime();
        const completed = new Date(wo.completedAt!).getTime();
        return (completed - created) / (1000 * 60 * 60); // Hours
      });
    avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;
  }

  // Aggregate labor hours
  const laborStats = await prisma.workOrderLabor.aggregate({
    where: {
      workOrder: { tenantId },
      startTime: { gte: startDate, lte: endDate },
    },
    _sum: { hours: true },
    _count: true,
  });

  // Aggregate parts usage
  const partsUsage = await prisma.workOrderPart.aggregate({
    where: {
      workOrder: { tenantId },
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { quantity: true, totalCost: true },
    _count: true,
  });

  // Count by status
  const statusCounts = Object.fromEntries(
    workOrderStats.map(stat => [stat.status, stat._count.id])
  );

  // Log the aggregated metrics (in production, store these in an analytics table)
  const metrics = {
    tenantId,
    period: type,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    workOrders: {
      total: Object.values(statusCounts).reduce((a: number, b) => a + (b as number), 0),
      byStatus: statusCounts,
      completed: totalCompleted,
      avgCompletionTimeHours: Math.round(avgCompletionTime * 100) / 100,
    },
    labor: {
      totalEntries: laborStats._count,
      totalHours: laborStats._sum.hours?.toNumber() || 0,
    },
    parts: {
      totalUsed: partsUsage._count,
      totalQuantity: partsUsage._sum.quantity || 0,
      totalCost: partsUsage._sum.totalCost?.toNumber() || 0,
    },
    efficiency: {
      actualVsEstimated: totalEstimatedHours > 0
        ? Math.round((totalActualHours / totalEstimatedHours) * 100)
        : null,
    },
  };

  logger.info({ metrics }, 'Aggregation metrics computed');

  // Store in Redis for dashboard queries (cache for 24 hours)
  const cacheKey = `metrics:${tenantId}:${type}:${date}`;
  await connection.setex(cacheKey, 86400, JSON.stringify(metrics));

  logger.info({ type, tenantId, cacheKey }, 'Aggregation job completed');
}

// Create workers
const emailWorker = new Worker(
  'email',
  processEmailJob,
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 60000, // 100 emails per minute
    },
  },
);

const pushWorker = new Worker(
  'push-notification',
  processPushNotificationJob,
  {
    connection,
    concurrency: 10,
  },
);

const aggregationWorker = new Worker(
  'aggregation',
  processAggregationJob,
  {
    connection,
    concurrency: 1, // One at a time for heavy operations
  },
);

// Worker event handlers
function setupWorkerEvents(worker: Worker, name: string) {
  worker.on('completed', (job) => {
    logger.info({ worker: name, jobId: job.id }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ worker: name, jobId: job?.id, error: err.message }, 'Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ worker: name, error: err.message }, 'Worker error');
  });
}

setupWorkerEvents(emailWorker, 'Email');
setupWorkerEvents(pushWorker, 'Push');
setupWorkerEvents(aggregationWorker, 'Aggregation');

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down workers...');
  await Promise.all([
    emailWorker.close(),
    pushWorker.close(),
    aggregationWorker.close(),
  ]);
  await prisma.$disconnect();
  await pool.end();
  await connection.quit();
  logger.info('Workers shut down gracefully');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info('TaskMaster Worker started');
logger.info({ queues: ['email', 'push-notification', 'aggregation'] }, 'Listening for jobs');
