import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { z } from 'zod';
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

  // This is a placeholder - actual aggregation would query the database
  // and compute metrics like:
  // - Work orders completed
  // - Average completion time
  // - Parts used
  // - Labor hours

  logger.info({ type: data.type, tenantId: data.tenantId }, 'Aggregation job completed');
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
  await connection.quit();
  logger.info('Workers shut down gracefully');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info('TaskMaster Worker started');
logger.info({ queues: ['email', 'push-notification', 'aggregation'] }, 'Listening for jobs');
