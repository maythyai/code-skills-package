#!/usr/bin/env node
// code-spec-fixture.test.mjs — real fixture tests for csp-code-spec/scripts/code_spec.sh
// Template F: happy + failure + indirect path, /tmp fixture (absolute paths, cwd-trap safe).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SCRIPT = join(ROOT, 'csp-workflow/skills/csp-code-spec/scripts/code_spec.sh');
const TARGET_GIT = execFileSync('git', ['-C', ROOT, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' }).trim();

// Run code_spec.sh against a fixture root via CSP_PROJECT_ROOT (never cd into TARGET_ROOT).
function run(args, opts = {}) {
  const env = { ...process.env, CSP_PROJECT_ROOT: opts.root };
  if (opts.app) env.CSP_APP = opts.app;
  try {
    const out = execFileSync('bash', [SCRIPT, ...args], {
      encoding: 'utf8',
      env,
      cwd: tmpdir(), // cwd deliberately outside both fixture and TARGET_ROOT
      maxBuffer: 1e7,
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

// Build a /tmp git fixture with a known entry-point source file + deliberate defect.
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'csp-code-spec-'));
  // init git
  execFileSync('git', ['-C', root, 'init', '-q']);
  execFileSync('git', ['-C', root, 'config', 'user.email', 't@t']);
  execFileSync('git', ['-C', root, 'config', 'user.name', 't']);
  // a Python HTTP entry point
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'app.py'),
    '@app.route("/login")\ndef login():\n    pass\n\nif __name__ == "__main__":\n    app.run()\n');
  // a CLI entry point
  writeFileSync(join(root, 'src', 'cli.py'), 'import argparse\nparser = argparse.ArgumentParser()\n');
  execFileSync('git', ['-C', root, 'add', '-A']);
  execFileSync('git', ['-C', root, 'commit', '-qm', 'init']);
  return root;
}

test('happy: baseline returns HEAD/branch/remote, exit 0', () => {
  const root = makeFixture();
  try {
    const { code, out } = run(['baseline'], { root });
    assert.equal(code, 0);
    assert.match(out, /Git baseline/);
    assert.match(out, /HEAD:/);
    assert.match(out, /Remote:\s+github\.com/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('happy: entrypoints finds HTTP + CLI signals with file:line', () => {
  const root = makeFixture();
  try {
    const { code, out } = run(['entrypoints'], { root });
    assert.equal(code, 0);
    assert.match(out, /HTTP\|/);
    assert.match(out, /src\/app\.py/);
    assert.match(out, /CLI\|/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('happy: graph emits node/edge skeleton', () => {
  const root = makeFixture();
  try {
    const { code, out } = run(['graph', 'src'], { root });
    assert.equal(code, 0);
    assert.match(out, /Nodes \(definitions\)/);
    assert.match(out, /def login/); // python def
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('failure: not a git repo -> exit 2 with clear message', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-nogit-'));
  try {
    const { code, out } = run(['baseline'], { root });
    assert.equal(code, 2);
    assert.match(out, /not a git repository/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('failure: unknown subcommand -> exit 1', () => {
  const root = makeFixture();
  try {
    const { code } = run(['bogus'], { root });
    assert.equal(code, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('indirect: diff-since reads prev SHA from CMS baseline file when omitted, exit 2 if absent', () => {
  const root = makeFixture();
  try {
    const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    // no baseline file + no arg -> exit 2 "no prev SHA; run full distillation first"
    const r1 = run(['diff-since'], { root });
    assert.equal(r1.code, 2);
    assert.match(r1.out, /no prev SHA|full distillation/i);
    // now write a baseline file referencing HEAD, omit arg -> reads indirectly
    const app = execFileSync('basename', [root], { encoding: 'utf8' }).trim();
    const cmsDir = join(root, '.csp/code-spec', app);
    mkdirSync(cmsDir, { recursive: true });
    writeFileSync(join(cmsDir, 'CODE-MODULE-SPEC.md'), `- Baseline SHA: ${head}\n`);
    const r2 = run(['diff-since'], { root, app });
    assert.equal(r2.code, 0);
    assert.match(r2.out, /Files changed since/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('cwd-trap: TARGET_ROOT git status is clean (fixture did not pollute)', () => {
  // sanity: the repo is still a git repo and no stray fixture files landed in it
  assert.equal(TARGET_GIT, 'true');
  const status = execFileSync('git', ['-C', ROOT, 'status', '--porcelain'], { encoding: 'utf8' });
  // should not contain any /tmp fixture path leakage
  assert.equal(status.includes('csp-code-spec-'), false);
});
