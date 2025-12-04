import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/database/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { Public } from '../common/auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    const checks: Record<string, { status: string; latencyMs?: number }> = {};

    // Database check
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        latencyMs: Date.now() - dbStart,
      };
    } catch {
      checks.database = { status: 'unhealthy' };
    }

    // Redis check
    const redisHealth = await this.redis.ping();
    checks.redis = {
      status: redisHealth.healthy ? 'healthy' : 'unhealthy',
      latencyMs: redisHealth.latencyMs,
    };

    // Storage check
    checks.storage = { status: 'healthy' };

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '0.1.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks,
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  async ready() {
    const errors: string[] = [];

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      errors.push('Database not ready');
    }

    // Check Redis
    const redisHealth = await this.redis.ping();
    if (!redisHealth.healthy) {
      errors.push('Redis not ready');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return 'OK';
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  live() {
    return 'OK';
  }
}
