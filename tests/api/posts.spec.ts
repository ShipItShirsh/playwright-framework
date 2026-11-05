import { test, expect } from '@playwright/test';
import { apiGet, apiPost } from '../tasks/api';

test.describe('Posts API', () => {
  test('GET /posts?userId=1 returns only that user\'s posts @smoke @regression', async ({ request }, testInfo) => {
    const res = await apiGet(request, '/posts?userId=1', { testInfo });
    expect(res.status).toBe(200);
    const posts = res.body as Array<{ userId: number; id: number; title: string }>;
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) expect(p.userId).toBe(1);
  });

  test('POST /posts creates a resource (201 + id) @regression', async ({ request }, testInfo) => {
    const res = await apiPost(request, '/posts', { title: 'portfolio check', body: 'created by automated test', userId: 1 }, { testInfo });
    expect(res.status).toBe(201);
    const created = res.body as { id: number; title: string };
    expect(created.id).toBeGreaterThan(0);
    expect(created.title).toBe('portfolio check');
  });

  test('GET /posts/99999 is an explicit expected 404 @regression', async ({ request }, testInfo) => {
    const res = await apiGet(request, '/posts/99999', { allow404: true, testInfo });
    expect(res.status).toBe(404);
  });
});
