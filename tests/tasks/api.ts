import type { APIRequestContext, TestInfo } from '@playwright/test';

/**
 * API tasks — thin wrappers over Playwright's request context.
 * Policy (hard pass/fail): an unexpected 404 fails the test immediately
 * with the path in the message. Expected-error tests pass
 * { allow404: true } explicitly — no silent soft-passes.
 */
export interface ApiResult {
  status: number;
  body: unknown;
}

async function attach(testInfo: TestInfo | undefined, name: string, data: unknown) {
  if (!testInfo) return;
  await testInfo.attach(name, {
    body: JSON.stringify(data, null, 2),
    contentType: 'application/json',
  });
}

export async function apiGet(
  request: APIRequestContext,
  path: string,
  opts: { allow404?: boolean; testInfo?: TestInfo } = {},
): Promise<ApiResult> {
  const res = await request.get(path);
  const body: unknown = await res.json().catch(() => null);
  await attach(opts.testInfo, `GET ${path}`, { status: res.status(), body });
  if (res.status() === 404 && !opts.allow404) {
    throw new Error(`GET ${path} returned 404 — required endpoint missing (hard fail by policy)`);
  }
  return { status: res.status(), body };
}

export async function apiPost(
  request: APIRequestContext,
  path: string,
  data: Record<string, unknown>,
  opts: { testInfo?: TestInfo } = {},
): Promise<ApiResult> {
  const res = await request.post(path, { data });
  const body: unknown = await res.json().catch(() => null);
  await attach(opts.testInfo, `POST ${path}`, { status: res.status(), body });
  return { status: res.status(), body };
}

/** Fail clearly when a response looks like an auth error rather than data. */
export function assertNotAuthError(result: ApiResult, context: string): void {
  if (result.status === 401 || result.status === 403) {
    throw new Error(`${context}: auth error ${result.status} — check session/token, do not retry blindly`);
  }
}
