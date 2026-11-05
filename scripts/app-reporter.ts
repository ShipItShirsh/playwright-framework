import * as fs from 'fs';
import * as path from 'path';
import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

/**
 * Minimal application reporter: writes a small machine-readable summary
 * (app-report.json) and a self-contained HTML summary next to the
 * built-in Playwright report. A production version of this reporter
 * also tracked per-test retry/flakiness history across runs.
 */
interface Row { title: string; status: string; durationMs: number }

class AppReporter implements Reporter {
  private rows: Row[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    this.rows.push({ title: test.titlePath().slice(1).join(' › '), status: result.status, durationMs: result.duration });
  }

  onEnd(result: FullResult): void {
    const dir = path.join('playwright-report');
    fs.mkdirSync(dir, { recursive: true });
    const passed = this.rows.filter((r) => r.status === 'passed').length;
    const summary = { status: result.status, total: this.rows.length, passed, failed: this.rows.length - passed, tests: this.rows };
    fs.writeFileSync(path.join(dir, 'app-report.json'), JSON.stringify(summary, null, 2));
    const items = this.rows.map((r) => `<li>${r.status === 'passed' ? '✅' : '❌'} ${r.title} (${r.durationMs}ms)</li>`).join('');
    fs.writeFileSync(
      path.join(dir, 'app-report.html'),
      `<html><head><title>App Report</title></head><body><h1>Application Report</h1><p>${passed}/${this.rows.length} passed</p><ul>${items}</ul></body></html>`,
    );
  }
}

export default AppReporter;
