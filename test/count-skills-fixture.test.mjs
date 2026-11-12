#!/usr/bin/env node
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(import.meta.dirname, '../scripts/count-skills.mjs');

function fixture(readme, run) {
  const root = mkdtempSync(join(tmpdir(), 'csp-count-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'csp-router'));
    copyFileSync(SCRIPT, join(root, 'scripts', 'count-skills.mjs'));
    writeFileSync(join(root, 'csp-router', 'registry.json'), JSON.stringify({
      version: '1.0', total_skills: 2, skills: [
        { path: 'csp-workflow/skills/one/SKILL.md' },
        { path: 'csp-patterns/agents/reviewer.md' },
      ],
    }));
    writeFileSync(join(root, 'README.md'), readme);
    writeFileSync(join(root, 'CLAUDE.md'), 'Total: 2 entries across layers\n');
    run(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

function count(root) {
  try {
    return { code: 0, out: execFileSync('node', [join(root, 'scripts/count-skills.mjs')], { encoding: 'utf8', cwd: root }) };
  } catch (error) {
    return { code: error.status ?? 2, out: String(error.stdout ?? '') + String(error.stderr ?? '') };
  }
}

test('Skills label counts SKILL.md entries, not all registry entries', () => fixture('· 1 Skills + 1 Agents\nTotal: 2 entries\n', root => {
  assert.equal(count(root).code, 0);
}));

test('out-of-date Skills label is detected even when total entries is correct', () => fixture('· 2 Skills + 1 Agents\nTotal: 2 entries\n', root => {
  const result = count(root);
  assert.equal(result.code, 1);
  assert.match(result.out, /README\.md/);
}));
