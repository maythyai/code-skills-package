#!/usr/bin/env node
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(import.meta.dirname, '../scripts/check-large-files.sh');

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'csp-size fixture-'));
  try { run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

function check(root, ...args) {
  try {
    return { code: 0, output: execFileSync('bash', [SCRIPT, root, ...args], { encoding: 'utf8' }) };
  } catch (error) {
    return { code: error.status ?? 2, output: String(error.stdout ?? '') + String(error.stderr ?? '') };
  }
}

test('missing docs and prompts are reported and do not fail an empty project', () => fixture(root => {
  const result = check(root);
  assert.equal(result.code, 0);
  assert.match(result.output, /docs.*not present|not present.*docs/i);
  assert.match(result.output, /prompts.*not present|not present.*prompts/i);
}));

test('50 KiB markdown at a path with spaces warns, and warnings do not block', () => fixture(root => {
  mkdirSync(join(root, 'docs', 'product plans'), { recursive: true });
  writeFileSync(join(root, 'docs', 'product plans', 'PRD draft.md'), 'a'.repeat(50 * 1024));
  const result = check(root);
  assert.equal(result.code, 0);
  assert.match(result.output, /PRD draft\.md/);
  assert.match(result.output, /warning/i);
}));

test('220 KiB active PRD is not a default hard failure; explicit limit is opt-in', () => fixture(root => {
  mkdirSync(join(root, 'docs', 'prd'), { recursive: true });
  writeFileSync(join(root, 'docs', 'prd', 'PRD-active.md'), 'a'.repeat(220 * 1024));
  assert.equal(check(root).code, 0);
  assert.equal(check(root, '--fail-kb', '250').code, 0);
  const result = check(root, '--fail-kb', '200');
  assert.equal(result.code, 1);
  assert.match(result.output, /PRD-active\.md/);
}));

test('JSON index size is not treated as a Markdown constraint', () => fixture(root => {
  mkdirSync(join(root, '.csp'), { recursive: true });
  writeFileSync(join(root, '.csp', 'manifest.json'), 'x'.repeat(600 * 1024));
  const result = check(root, '--fail-kb', '1');
  assert.equal(result.code, 0);
  assert.doesNotMatch(result.output, /manifest\.json.*(MUST|failure)/i);
}));

test('invalid opt-in thresholds fail with an actionable usage error', () => fixture(root => {
  const result = check(root, '--fail-kb', 'none');
  assert.equal(result.code, 2);
  assert.match(result.output, /fail-kb/i);
}));
