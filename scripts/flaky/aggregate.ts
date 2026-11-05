/**
 * Flaky-test aggregation: turn a history of Playwright JSON-reporter
 * files into per-test stability statistics.
 *
 * Definitions (kept deliberately simple and documented, so a team can
 * argue with them):
 * - A test's outcome in one run is:
 *     "flaky"   — it failed at least one attempt but passed on a retry
 *     "passed"  — passed on the first attempt
 *     "failed"  — its final attempt failed (or it timed out)
 *     "skipped" — skipped in that run (excluded from all rates)
 * - score = share of counted runs where the test did NOT pass cleanly
 *   ((flaky + failed) / counted runs). Higher is worse.
 * - classification:
 *     "quarantine" — score >= 0.34 over at least 3 counted runs, or
 *                    flaky in at least 2 of the last 3 counted runs
 *     "watch"      — score > 0 (any instability seen)
 *     "stable"     — score == 0
 *
 * The functions here are pure — file IO lives in the CLI — so the
 * logic is unit-testable without touching a browser.
 */

export interface PwResult {
  status: string;
  retry: number;
  duration: number;
}
export interface PwTest {
  projectName: string;
  results: PwResult[];
}
export interface PwSpec {
  title: string;
  file: string;
  tests: PwTest[];
}
export interface PwSuite {
  title: string;
  file?: string;
  specs?: PwSpec[];
  suites?: PwSuite[];
}
export interface PwReport {
  suites: PwSuite[];
}

export type RunOutcome = 'passed' | 'flaky' | 'failed' | 'skipped';

export interface TestHistory {
  /** project :: file :: title */
  id: string;
  project: string;
  file: string;
  title: string;
  runs: number; // counted runs (excludes skipped)
  passed: number;
  flaky: number;
  failed: number;
  skipped: number;
  /** outcomes in run order, oldest first (counted runs only) */
  outcomes: RunOutcome[];
  avgDurationMs: number;
  score: number; // 0..1, higher is worse
  classification: 'stable' | 'watch' | 'quarantine';
}

function outcomeOf(test: PwTest): RunOutcome {
  const results = test.results ?? [];
  if (results.length === 0) return 'skipped';
  const final = results[results.length - 1];
  if (final.status === 'skipped') return 'skipped';
  if (final.status === 'passed') {
    return results.slice(0, -1).some((r) => r.status === 'failed' || r.status === 'timedOut') ? 'flaky' : 'passed';
  }
  return 'failed';
}

function durationOf(test: PwTest): number {
  const results = test.results ?? [];
  return results.length ? results[results.length - 1].duration : 0;
}

interface RawSpec {
  file: string;
  title: string;
  test: PwTest;
}

function collectSpecs(suite: PwSuite, inheritedFile: string, out: RawSpec[]): void {
  const file = suite.file ?? inheritedFile;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) out.push({ file: spec.file ?? file, title: spec.title, test });
  }
  for (const child of suite.suites ?? []) collectSpecs(child, file, out);
}

/** All (spec, test) pairs in one run's report. */
export function specsOfReport(report: PwReport): RawSpec[] {
  const out: RawSpec[] = [];
  for (const suite of report.suites ?? []) collectSpecs(suite, '', out);
  return out;
}

function classify(runs: number, outcomes: RunOutcome[], score: number): TestHistory['classification'] {
  const last3 = outcomes.slice(-3);
  const flakyInLast3 = last3.filter((o) => o === 'flaky').length;
  if ((runs >= 3 && score >= 0.34) || (last3.length === 3 && flakyInLast3 >= 2)) return 'quarantine';
  return score > 0 ? 'watch' : 'stable';
}

/**
 * Aggregate a run history. `reports` must be in run order (oldest
 * first) — the CLI sorts history files by name, so timestamped file
 * names give chronological order.
 */
export function aggregateReports(reports: PwReport[]): TestHistory[] {
  const byId = new Map<string, TestHistory & { durationTotal: number }>();
  for (const report of reports) {
    for (const { file, title, test } of specsOfReport(report)) {
      const project = test.projectName ?? '';
      const id = `${project} :: ${file} :: ${title}`;
      let entry = byId.get(id);
      if (!entry) {
        entry = {
          id,
          project,
          file,
          title,
          runs: 0,
          passed: 0,
          flaky: 0,
          failed: 0,
          skipped: 0,
          outcomes: [],
          avgDurationMs: 0,
          score: 0,
          classification: 'stable',
          durationTotal: 0,
        };
        byId.set(id, entry);
      }
      const outcome = outcomeOf(test);
      if (outcome === 'skipped') {
        entry.skipped += 1;
        continue;
      }
      entry.runs += 1;
      entry[outcome] += 1;
      entry.outcomes.push(outcome);
      entry.durationTotal += durationOf(test);
    }
  }
  const histories: TestHistory[] = [...byId.values()].map((e) => {
    const score = e.runs ? (e.flaky + e.failed) / e.runs : 0;
    return {
      id: e.id,
      project: e.project,
      file: e.file,
      title: e.title,
      runs: e.runs,
      passed: e.passed,
      flaky: e.flaky,
      failed: e.failed,
      skipped: e.skipped,
      outcomes: e.outcomes,
      avgDurationMs: e.runs ? Math.round(e.durationTotal / e.runs) : 0,
      score,
      classification: classify(e.runs, e.outcomes, score),
    };
  });
  // Worst first: quarantine candidates at the top, then by score, then
  // by how much evidence (runs) backs the ranking.
  return histories.sort((a, b) => b.score - a.score || b.runs - a.runs || a.title.localeCompare(b.title));
}

export function renderMarkdown(histories: TestHistory[], runCount: number): string {
  const quarantined = histories.filter((h) => h.classification === 'quarantine');
  const watching = histories.filter((h) => h.classification === 'watch');
  const lines: string[] = [
    '# Flaky test report',
    '',
    `Runs analysed: ${runCount} · Tests tracked: ${histories.length} · ` +
      `Quarantine candidates: ${quarantined.length} · Watch list: ${watching.length}`,
    '',
    '| Test | Project | Runs | Pass | Flaky | Fail | Score | Class | Avg duration |',
    '|---|---|---:|---:|---:|---:|---:|---|---:|',
  ];
  for (const h of histories) {
    lines.push(
      `| ${h.title} | ${h.project} | ${h.runs} | ${h.passed} | ${h.flaky} | ${h.failed} | ` +
        `${h.score.toFixed(2)} | ${h.classification} | ${h.avgDurationMs} ms |`,
    );
  }
  lines.push('', '## Quarantine list', '');
  if (quarantined.length === 0) {
    lines.push('No tests meet the quarantine criteria in this history.');
  } else {
    for (const h of quarantined) {
      lines.push(
        `- **${h.title}** (${h.project}, ${h.file}) — score ${h.score.toFixed(2)} ` +
          `over ${h.runs} runs (${h.flaky} flaky, ${h.failed} failed)`,
      );
    }
  }
  lines.push(
    '',
    'Quarantine criteria: score >= 0.34 over at least 3 counted runs, or flaky in at least 2 of the last 3 runs. ' +
      'Quarantine means: remove from the release gate, file a defect, and re-admit only after 20 consecutive clean runs.',
    '',
  );
  return lines.join('\n');
}
