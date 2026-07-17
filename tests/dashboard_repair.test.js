/**
 * tests/dashboard_repair.test.js
 * Structural locks for the Keeper dashboard repairs (v3 spec §2d + design audit):
 *   Repair 1 — dashboard.js is a real closure exposing every function the HTML calls
 *   Repair 2 — previously malformed markup (filter <label>, evidence <li>) stays fixed
 *   Repair 3 — every DB-sourced field is escaped before hitting innerHTML (anon
 *              insert policy on shared_runs makes run fields untrusted input)
 */

import { strict as assert } from 'node:assert';
import { describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsPath = join(root, 'admin', 'dashboard.js');
const js = readFileSync(jsPath, 'utf8');
const html = readFileSync(join(root, 'admin', 'dashboard.html'), 'utf8');

describe('repair 1 — dashboard.js module structure', () => {
  test('passes node --check', () => {
    const res = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
  });

  test('is wrapped in a closure assigned to Dashboard', () => {
    assert.match(js, /const Dashboard = \(\(\) => \{/, 'no IIFE closure');
    assert.match(js, /\}\)\(\);\s*$/, 'closure never closed/invoked');
  });

  test('defines every function the UI calls', () => {
    for (const fn of ['login', 'load', 'applyFilter', 'toggleSignals', 'toggleInvite', 'copyInvite', '_showError']) {
      assert.match(js, new RegExp(`function ${fn}\\s*\\(`), `missing function: ${fn}`);
    }
  });

  test('exposes the public API the HTML onclick handlers use', () => {
    const ret = js.match(/return \{([^}]*)\}/s);
    assert.ok(ret, 'no return { … } API object');
    for (const fn of ['login', 'load', 'applyFilter', 'toggleSignals', 'toggleInvite', 'copyInvite']) {
      assert.ok(ret[1].includes(fn), `API missing ${fn}`);
    }
  });

  test('does not reference SPA_CONFIG (dashboard.html never loads js/config.js)', () => {
    assert.ok(!js.includes('SPA_CONFIG'), 'SPA_CONFIG referenced — ReferenceError at load');
  });
});

describe('repair 2 — malformed markup', () => {
  test('filter label is a real <label> tag', () => {
    assert.ok(html.includes('<label'), 'missing <label opener');
    assert.ok(!/[^<l]abel\s+style=/.test(html), 'orphaned "abel" text still renders on the page');
  });

  test('evidence items render as real <li> elements', () => {
    assert.ok(js.includes('<li>'), 'evidence template has no <li> opener');
    assert.ok(!js.includes('`>${'), 'evidence template still emits a stray ">"');
  });
});

describe('repair 3 — XSS: DB fields are escaped before innerHTML', () => {
  test('an esc() HTML-escaping helper exists and covers all five entities', () => {
    assert.match(js, /const esc\s*=|function esc\s*\(/, 'no esc() helper');
    for (const ent of ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;']) {
      assert.ok(js.includes(ent), `esc() missing entity ${ent}`);
    }
  });

  test('no run field is interpolated raw into a template string', () => {
    assert.ok(!/\$\{r\./.test(js), 'found raw ${r.…} interpolation — wrap it in esc()');
  });

  test('generated onclick handlers pass only the numeric row index, never data', () => {
    assert.ok(js.includes('Dashboard.toggleSignals(${i})'), 'toggleSignals must take the row index');
    assert.ok(js.includes('Dashboard.toggleInvite(${i})'), 'toggleInvite must take the row index');
    assert.ok(js.includes('Dashboard.copyInvite(${i})'), 'copyInvite must take the row index');
  });
});
