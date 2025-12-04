import { INestApplication } from '@nestjs/common';

declare global {
  var app: INestApplication;
}

beforeAll(() => {
  // Global setup before all e2e tests
  jest.setTimeout(30000);
});

afterAll(async () => {
  // Global cleanup after all e2e tests
  if (global.app) {
    await global.app.close();
  }
});
