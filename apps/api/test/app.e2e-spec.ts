import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    global.app = app;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Checks', () => {
    it('/api/v1/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('checks');
          expect(res.body.checks).toHaveProperty('database');
          expect(res.body.checks).toHaveProperty('redis');
        });
    });

    it('/api/v1/health/live (GET) - should return OK', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200)
        .expect('OK');
    });
  });
});
