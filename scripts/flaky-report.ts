import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { aggregateReports, renderMarkdown, type PwReport } from './flaky/aggregate';

/**
 * Flaky-test reporter CLI.
 *
 * Flow:
 *   1. Every Playwright run writes a JSON report (the config in this
 *      repo sends it to test-results/results.json).
 *   2. Ingest a run into the local history:
 *        npm run report:flaky -- --ingest test-results/results.json
 *      (history lives in .artifacts/flaky-history/, timestamped so
 *      filename order is chronological; in CI, persist that folder
 *      between runs via artifacts/cache if you want trending there)
 *   3. Build the report from everything in the history:
 *        npm run report:flaky
 *      Writes playwright-report/flaky-report.md and .json and prints
 *      the quarantine list.
 */
const HISTORY_DIR = '.artifacts/flaky-history';
const OUT_DIR = 'playwright-report';

function ingest(file: string): void {
  if (!existsSync(file)) throw new Error(`cannot ingest: ${file} does not exist`);
  mkdirSync(HISTORY_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(HISTORY_DIR, `${stamp}-${basename(file)}`);
  copyFileSync(file, dest);
  console.log(`ingested ${file} -> ${dest}`);
}

function main(): void {
  const args = process.argv.slice(2);
  const ingestIdx = args.indexOf('--ingest');
  if (ingestIdx >= 0) {
    const file = args[ingestIdx + 1];
    if (!file) throw new Error('--ingest needs a file path');
    ingest(file);
  }
  if (!existsSync(HISTORY_DIR)) {
    console.log(`no history yet at ${HISTORY_DIR} — run the suite, then --ingest a results file.`);
    return;
  }
  const files = readdirSync(HISTORY_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
  if (files.length === 0) {
    console.log(`history folder ${HISTORY_DIR} is empty — nothing to report.`);
    return;
  }
  const reports = files.map((f) => JSON.parse(readFileSync(join(HISTORY_DIR, f), 'utf8')) as PwReport);
  const histories = aggregateReports(reports);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'flaky-report.md'), renderMarkdown(histories, files.length));
  writeFileSync(join(OUT_DIR, 'flaky-report.json'), JSON.stringify({ runs: files.length, tests: histories }, null, 2));

  const quarantined = histories.filter((h) => h.classification === 'quarantine');
  console.log(`analysed ${files.length} run(s), ${histories.length} test(s)`);
  console.log(`report: ${join(OUT_DIR, 'flaky-report.md')}`);
  if (quarantined.length === 0) {
    console.log('quarantine list: empty — no test meets the criteria.');
  } else {
    console.log('quarantine list:');
    for (const h of quarantined) {
      console.log(`  - ${h.title} (${h.project}) score ${h.score.toFixed(2)} over ${h.runs} runs`);
    }
  }
}

main();
