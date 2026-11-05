import { test, expect } from '@playwright/test';
import {
  aggregateReports,
  renderMarkdown,
  type PwReport,
  type PwResult,
} from '../../scripts/flaky/aggregate';

/**
 * Unit tests for the flaky-test aggregation engine. These run without
 * a browser (project "unit") against synthetic Playwright JSON
 * reports, so the classification rules are pinned down exactly.
 */
function result(status: string, retry = 0, duration = 100): PwResult {
  return { status, retry, duration };
}

function reportWith(outcomes: Record<string, PwResult[]>): PwReport {
  return {
    suites: [
      {
        title: 'root',
        file: 'tests/example.spec.ts',
        specs: Object.entries(outcomes).map(([title, results]) => ({
          title,
          file: 'tests/example.spec.ts',
          tests: [{ projectName: 'ui', results }],
        })),
      },
    ],
  };
}

const CLEAN = [result('passed')];
const FLAKY = [result('failed'), result('passed', 1)];
const FAILED = [result('failed'), result('failed', 1)];

test.describe('flaky aggregation', () => {
  test('a test that always passes cleanly is stable with score 0', () => {
    const [h] = aggregateReports([reportWith({ 'logs in': CLEAN }), reportWith({ 'logs in': CLEAN })]);
    expect(h.runs).toBe(2);
    expect(h.passed).toBe(2);
    expect(h.score).toBe(0);
    expect(h.classification).toBe('stable');
  });

  test('a retry-pass counts as flaky, not passed', () => {
    const [h] = aggregateReports([reportWith({ 'checks out': FLAKY })]);
    expect(h.flaky).toBe(1);
    expect(h.passed).toBe(0);
    expect(h.score).toBe(1);
    expect(h.classification).toBe('watch'); // one run is not enough evidence to quarantine
  });

  test('repeated flakiness across runs lands on the quarantine list', () => {
    const runs = [
      reportWith({ 'pays by card': FLAKY }),
      reportWith({ 'pays by card': CLEAN }),
      reportWith({ 'pays by card': FLAKY }),
    ];
    const [h] = aggregateReports(runs);
    expect(h.runs).toBe(3);
    expect(h.flaky).toBe(2);
    expect(h.classification).toBe('quarantine'); // flaky in 2 of last 3
    const md = renderMarkdown([h], 3);
    expect(md).toContain('pays by card');
    expect(md).toContain('## Quarantine list');
  });

  test('a consistently failing test scores 1 and quarantines on volume', () => {
    const runs = [reportWith({ 'saves profile': FAILED }), reportWith({ 'saves profile': FAILED }), reportWith({ 'saves profile': FAILED })];
    const [h] = aggregateReports(runs);
    expect(h.failed).toBe(3);
    expect(h.score).toBe(1);
    expect(h.classification).toBe('quarantine');
  });

  test('skipped runs are excluded from rates', () => {
    const runs = [reportWith({ 'beta only': [result('skipped')] }), reportWith({ 'beta only': CLEAN })];
    const [h] = aggregateReports(runs);
    expect(h.skipped).toBe(1);
    expect(h.runs).toBe(1);
    expect(h.score).toBe(0);
  });

  test('worst tests sort first', () => {
    const runs = [
      reportWith({ 'good test': CLEAN, 'bad test': FAILED }),
      reportWith({ 'good test': CLEAN, 'bad test': FLAKY }),
      reportWith({ 'good test': CLEAN, 'bad test': FAILED }),
    ];
    const histories = aggregateReports(runs);
    expect(histories[0].title).toBe('bad test');
    expect(histories[1].title).toBe('good test');
  });
});
