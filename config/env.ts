import * as dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Environment loading + validation.
 * Pattern: one Zod schema validates the whole config up front, so a run
 * fails fast with a clear message instead of failing mid-test on a
 * missing URL. ENV selects the file (.env.qa, .env.dev, ...); default qa.
 */
const schema = z.object({
  UI_BASE_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  TEST_USER: z.string().min(1),
  TEST_PASSWORD: z.string().min(1),
  LOCKED_USER: z.string().min(1),
});

export type AppConfig = z.infer<typeof schema>;

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const env = (process.env.ENV ?? 'qa').toLowerCase();
  dotenv.config({ path: `.env.${env}` });

  cached = schema.parse({
    UI_BASE_URL: process.env.UI_BASE_URL ?? 'https://www.saucedemo.com',
    API_BASE_URL: process.env.API_BASE_URL ?? 'https://jsonplaceholder.typicode.com',
    TEST_USER: process.env.TEST_USER ?? 'standard_user',
    // Public demo credentials, published by SauceDemo itself — not a secret.
    TEST_PASSWORD: process.env.TEST_PASSWORD ?? 'secret_sauce',
    LOCKED_USER: process.env.LOCKED_USER ?? 'locked_out_user',
  });
  return cached;
}

export const AUTH_STATE = '.auth/qa.json';
