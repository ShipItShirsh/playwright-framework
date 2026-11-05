import { test, expect } from '@playwright/test';
import { z } from 'zod';
import { apiGet, assertNotAuthError } from '../tasks/api';

const userSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  address: z.object({ city: z.string().min(1), zipcode: z.string().min(1) }),
});

test.describe('Users API', () => {
  test('GET /users returns 10 schema-valid users @smoke @regression', async ({ request }, testInfo) => {
    const res = await apiGet(request, '/users', { testInfo });
    assertNotAuthError(res, 'GET /users');
    expect(res.status).toBe(200);
    const users = z.array(userSchema).parse(res.body);
    expect(users).toHaveLength(10);
  });

  test('GET /users/1 returns the expected record @regression', async ({ request }, testInfo) => {
    const res = await apiGet(request, '/users/1', { testInfo });
    expect(res.status).toBe(200);
    const user = userSchema.parse(res.body);
    expect(user.username).toBe('Bret');
  });
});
