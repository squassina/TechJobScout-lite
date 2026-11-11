#!/usr/bin/env node
import { DEFAULT_BOARDS, boardUrl, inspectBoardPayload } from '../src/ats/boards.js';
import { normalizeJobs } from '../src/ats/normalizers.js';

const timeoutMs = 20000;
const directBoards = DEFAULT_BOARDS.filter(board => board.ats !== 'manual');
const results = await Promise.all(directBoards.map(async board => {
  const url = boardUrl(board);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    const elapsedMs = Date.now() - started;
    if (!response.ok) {
      return { company: board.company, ats: board.ats, status: response.status, elapsedMs, ok: false, error: `HTTP ${response.status}`, url };
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) {
      return { company: board.company, ats: board.ats, status: response.status, elapsedMs, ok: false, error: `Expected JSON, received ${contentType || 'unknown content type'}`, url };
    }
    const payload = await response.json();
    const inspection = inspectBoardPayload(board.ats, payload);
    if (!inspection.valid) {
      return { company: board.company, ats: board.ats, status: response.status, elapsedMs, ok: false, error: inspection.reason, url };
    }
    const jobs = normalizeJobs(board.ats, payload, board);
    return {
      company: board.company, ats: board.ats, status: response.status, elapsedMs,
      ok: inspection.usable > 0, returned: inspection.count, usable: inspection.usable,
      normalized: jobs.length, warning: inspection.reason || (inspection.count === 0 ? 'Board responded successfully but currently returned zero jobs' : null),
      url
    };
  } catch (error) {
    const message = error.name === 'AbortError' ? `Timed out after ${timeoutMs}ms` : error.message;
    return { company: board.company, ats: board.ats, elapsedMs: Date.now() - started, ok: false, error: message, url };
  } finally {
    clearTimeout(timer);
  }
}));

const passed = results.filter(result => result.ok).length;
const failed = results.length - passed;
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), passed, failed, manual: DEFAULT_BOARDS.filter(board => board.ats === 'manual').map(board => ({ company: board.company, url: board.board })), results }, null, 2));
} else {
  console.log('TechJobScout Lite — live ATS board validation');
  console.log(`Checked ${results.length} public API boards: ${passed} passed, ${failed} failed\n`);
  for (const result of results) {
    const status = result.ok ? 'PASS' : 'FAIL';
    const detail = result.error || result.warning || `${result.normalized} normalized jobs`;
    console.log(`[${status}] ${result.company} (${result.ats}) — HTTP ${result.status ?? 'N/A'} — ${result.elapsedMs}ms — ${detail}`);
    if (!result.ok) console.log(`       ${result.url}`);
  }
  console.log('\nManual sources (not API-tested):');
  for (const board of DEFAULT_BOARDS.filter(item => item.ats === 'manual')) console.log(`[MANUAL] ${board.company} — ${board.board}`);
  console.log('\nNote: this Node.js check bypasses browser CORS. A PASS confirms endpoint reachability and payload normalization, not browser access from GitHub Pages.');
}
if (failed) process.exitCode = 1;
