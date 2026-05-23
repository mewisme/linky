// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';

test.describe('API Endpoints', () => {
  test('Queue status returns correct format', async ({ request }) => {
    const response = await request.get('/api/v1/video-chat/queue-status');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('queueSize');
    expect(typeof body.queueSize).toBe('number');
  });

  test('End-call-unload with invalid socketId returns 400', async ({ request }) => {
    const response = await request.post('/api/v1/video-chat/end-call-unload', {
      data: {},
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.message).toContain('socketId');
  });
});
