#!/usr/bin/env node
// research-scripts-fixture.test.mjs — real fixture tests for research-skill CLIs
// Covers: csp-account-research/scripts/check.sh + account_research_toolkit.py,
//         csp-market-research/scripts/generate_market_visuals.py
// Template F: happy + failure + indirect, /tmp fixtures, cwd-trap safe.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CHECK_SH = join(ROOT, 'csp-patterns/skills/csp-account-research/scripts/check.sh');
const TOOLKIT = join(ROOT, 'csp-patterns/skills/csp-account-research/references/shared/account_research_toolkit.py');
const VISUALS = join(ROOT, 'csp-patterns/skills/csp-market-research/scripts/generate_market_visuals.py');
const SKILL_DIR = join(ROOT, 'csp-patterns/skills/csp-account-research');

function runBash(script, args, opts = {}) {
  const env = { ...process.env, CSP_PROJECT_ROOT: opts.root };
  try {
    const out = execFileSync('bash', [script, ...args], { encoding: 'utf8', env, cwd: tmpdir(), maxBuffer: 1e7 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}
function runPy(script, args, opts = {}) {
  const env = { ...process.env, ...(opts.env || {}) };
  try {
    const out = execFileSync('python3', [script, ...args], { encoding: 'utf8', env, cwd: opts.cwd || tmpdir(), maxBuffer: 1e7 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

// ---------- check.sh ----------

test('check.sh doctor: sub-skills present -> exit 0', () => {
  // check.sh uses SKILL_DIR derived from script location, independent of CSP_PROJECT_ROOT.
  const { code, out } = runBash(CHECK_SH, ['doctor'], {});
  assert.equal(code, 0);
  assert.match(out, /signal-scan SKILL\.md present/);
  assert.match(out, /depth-research SKILL\.md present/);
  assert.match(out, /deliverable SKILL\.md present/);
  assert.match(out, /All checks passed/);
});

test('check.sh gate: missing request.md -> exit 1 with clear reason', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-ar-gate-'));
  try {
    const runId = 'run-test-1';
    mkdirSync(join(root, '.csp/account-research/runs', runId), { recursive: true });
    const { code, out } = runBash(CHECK_SH, ['gate', 'phase0', runId], { root });
    assert.equal(code, 1);
    assert.match(out, /request\.md missing\/empty/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('check.sh gate: happy path — request.md + stage artifacts + .ready -> exit 0', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-ar-gate-ok-'));
  try {
    const runId = 'run-ok-1';
    const rdir = join(root, '.csp/account-research/runs', runId);
    const stageDir = join(rdir, 'l2');
    mkdirSync(stageDir, { recursive: true });
    writeFileSync(join(rdir, 'request.md'), '帮我调研一批客户\n');
    writeFileSync(join(stageDir, 'L2_全量信号扫描.csv'), 'header\n');
    writeFileSync(join(rdir, 'l2.ready'), '');
    const { code, out } = runBash(CHECK_SH, ['gate', 'l2', runId], { root });
    assert.equal(code, 0);
    assert.match(out, /request\.md present/);
    assert.match(out, /l2\.ready present/);
    assert.match(out, /All checks passed/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('check.sh gate: unknown stage -> exit 2', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-ar-unknown-'));
  try {
    const { code } = runBash(CHECK_SH, ['gate', 'bogus', 'r1'], { root });
    assert.equal(code, 2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ---------- account_research_toolkit.py ----------

test('toolkit init-workspace: creates deliverables under docs/ + runtime under .csp/', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-ar-init-'));
  try {
    const { code, out } = runPy(TOOLKIT, ['init-workspace', '--slug', 'demo-scope'], { cwd: root });
    assert.equal(code, 0);
    assert.match(out, /battle-handbook\/supporting/);
    assert.match(out, /process-archive\/validation-batches/);
    assert.ok(existsSync(join(root, 'docs/account-research/battle-handbook/supporting')));
    assert.ok(existsSync(join(root, '.csp/account-research/state/demo-scope/progress.json')));
    // deliverables must NOT live under .csp (the cwd-trap/path-split invariant)
    assert.ok(!existsSync(join(root, '.csp/account-research/state/demo-scope/docs')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('toolkit check-structure: happy — Phase 2 files present -> exit 0 + PASS', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-ar-struct-'));
  try {
    runPy(TOOLKIT, ['init-workspace', '--slug', 's1'], { cwd: root });
    const archDir = join(root, 'docs/account-research/process-archive');
    mkdirSync(archDir, { recursive: true });
    writeFileSync(join(archDir, 'L2_全量信号扫描.csv'), 'header\nrow\n');
    writeFileSync(join(archDir, 'L2_分层分析报告.md'), '# L2 信号扫描 分层 搜索过程\n');
    const { code, out } = runPy(TOOLKIT, ['check-structure', '--workspace', root, '--phase', '2'], { cwd: root });
    assert.equal(code, 0);
    assert.match(out, /PASS.*Phase 2.*落盘/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('toolkit check-structure: defect — missing Phase 2 files -> non-zero + WARN', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-ar-struct-miss-'));
  try {
    runPy(TOOLKIT, ['init-workspace', '--slug', 's1'], { cwd: root });
    const { code, out } = runPy(TOOLKIT, ['check-structure', '--workspace', root, '--phase', '2'], { cwd: root });
    assert.notEqual(code, 0);
    assert.match(out, /process-archive/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('toolkit validate-brief: missing required fields -> non-zero, lists failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-ar-brief-'));
  try {
    const briefPath = join(root, 'brief.json');
    writeFileSync(briefPath, JSON.stringify({ user_role: 'BD' })); // missing required fields
    const { code, out } = runPy(TOOLKIT, ['validate-brief', '--path', briefPath], { cwd: root });
    assert.notEqual(code, 0);
    assert.match(out, /FAIL|不合规|缺失/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('toolkit validate-brief: complete brief -> PASS', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-ar-brief-ok-'));
  try {
    const briefPath = join(root, 'brief.json');
    writeFileSync(briefPath, JSON.stringify({
      user_role: 'BD', audience: '一线BD', depth: 'L2', industry_name: 'SaaS',
      products: [{ name: 'ProdA', positioning: 'X', source: 'user' }], execution_path: 'l2',
    }));
    const { code, out } = runPy(TOOLKIT, ['validate-brief', '--path', briefPath], { cwd: root });
    assert.equal(code, 0);
    assert.match(out, /PASS|校验通过/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ---------- generate_market_visuals.py ----------

test('visuals --dry-run: emits prompt catalog without a configured generator (indirect path)', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-mr-vis-'));
  try {
    const figDir = join(root, 'figures');
    mkdirSync(figDir, { recursive: true });
    const env = { CSP_DIAGRAM_CMD: '', CSP_IMAGE_CMD: '' };
    const { code, out } = runPy(VISUALS, ['--topic', 'EV Charging', '--output-dir', figDir, '--dry-run'], { cwd: root, env });
    assert.equal(code, 0);
    assert.match(out, /DRY RUN/);
    assert.match(out, /01_market_growth_trajectory/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('visuals without env: emits [PROMPT] lines for the csp-tech-diagram / csp-fal-ai-media skills', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-mr-vis2-'));
  try {
    const figDir = join(root, 'figures');
    mkdirSync(figDir, { recursive: true });
    const env = { ...process.env };
    delete env.CSP_DIAGRAM_CMD; delete env.CSP_IMAGE_CMD;
    const { code, out } = runPy(VISUALS, ['--topic', 'AI in Healthcare', '--output-dir', figDir, '--only', 'growth'], { cwd: root, env });
    assert.equal(code, 0);
    assert.match(out, /PROMPT|DRY RUN/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ---------- cwd-trap ----------

test('cwd-trap: TARGET_ROOT git status has no fixture leakage', () => {
  const status = execFileSync('git', ['-C', ROOT, 'status', '--porcelain'], { encoding: 'utf8' });
  assert.equal(status.includes('csp-ar-') || status.includes('csp-mr-vis'), false);
});
