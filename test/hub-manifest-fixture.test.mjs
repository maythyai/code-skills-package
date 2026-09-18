#!/usr/bin/env node
// hub-manifest-fixture.test.mjs — real fixture tests for csp-knowledge-hub/scripts/hub_manifest.sh
// Template F: happy + failure + indirect + defect-injection, /tmp fixture, cwd-trap safe.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SCRIPT = join(ROOT, 'csp-workflow/skills/csp-knowledge-hub/scripts/hub_manifest.sh');

function run(args, opts = {}) {
  const env = { ...process.env, CSP_PROJECT_ROOT: opts.root };
  try {
    const out = execFileSync('bash', [SCRIPT, ...args], { encoding: 'utf8', env, cwd: tmpdir(), maxBuffer: 1e7 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

// A known-good hub fixture: manifest with 2 items + AGENTS.md (6 sections) + a frontmatter page.
function makeHubFixture({ agentsSections = 6, sidecar = false, noFrontmatter = false, itemHashes = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'csp-hub-'));
  execFileSync('git', ['-C', root, 'init', '-q']);
  execFileSync('git', ['-C', root, 'config', 'user.email', 't@t']);
  execFileSync('git', ['-C', root, 'config', 'user.name', 't']);
  const hub = join(root, '.csp');
  mkdirSync(join(hub, 'product-spec', 'modules'), { recursive: true });

  // substantive page (with or without frontmatter — defect injection)
  const pagePath = 'product-spec/modules/MOD-AUTH-1.md';
  const pageContent = noFrontmatter
    ? '# Auth module\nno frontmatter here\n'
    : '---\nsource_id: pms:MOD-AUTH-1\nsource_type: pms\ntitle: Auth\n---\n# Auth module\n';
  writeFileSync(join(hub, pagePath), pageContent);

  // compute git blob hash for the page (content-based baseline)
  execFileSync('git', ['-C', root, 'add', '-A']);
  execFileSync('git', ['-C', root, 'commit', '-qm', 'init']);
  const hash = execFileSync('git', ['-C', root, 'hash-object', join(root, '.csp', pagePath)], { encoding: 'utf8' }).trim();

  if (sidecar) writeFileSync(join(hub, pagePath + '.meta.json'), '{}');

  // AGENTS.md with N H2 sections
  const agents = Array.from({ length: agentsSections }, (_, i) => `## Section ${i + 1}\nbody\n`).join('\n');
  writeFileSync(join(hub, 'AGENTS.md'), agents);

  // manifest referencing the page
  const manifest = {
    items: [
      { source_id: 'pms:MOD-AUTH-1', source_type: 'pms', title: 'Auth', output_path: '.csp/' + pagePath,
        build_status: 'built', content_hash: itemHashes ? hash : 'stale' },
      { source_id: 'cms:app-1', source_type: 'cms', title: 'App entry points', output_path: '.csp/code-spec/app/CODE-MODULE-SPEC.md',
        build_status: 'pending' },
    ],
  };
  writeFileSync(join(hub, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return root;
}

test('happy: status reports item count + AGENTS sections, exit 0', () => {
  const root = makeHubFixture();
  try {
    const { code, out } = run(['status'], { root });
    assert.equal(code, 0);
    assert.match(out, /manifest items:\s+2/);
    assert.match(out, /AGENTS\.md sections:\s+6/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('happy: list emits items; locate finds by title via manifest', () => {
  const root = makeHubFixture();
  try {
    const r1 = run(['list'], { root });
    assert.equal(r1.code, 0);
    assert.match(r1.out, /pms:MOD-AUTH-1/);
    const r2 = run(['locate', 'Auth'], { root });
    assert.equal(r2.code, 0);
    assert.match(r2.out, /manifest\|/);
    assert.match(r2.out, /MOD-AUTH-1/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('happy: doctor PASS on clean hub, exit 0', () => {
  const root = makeHubFixture();
  try {
    const { code, out } = run(['doctor'], { root });
    assert.equal(code, 0);
    assert.match(out, /RESULT: PASS/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('failure: no manifest -> exit 2 with clear message', () => {
  const root = mkdtempSync(join(tmpdir(), 'csp-nohub-'));
  try {
    const { code, out } = run(['status'], { root });
    assert.equal(code, 2);
    assert.match(out, /no manifest/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('failure: unknown subcommand -> exit 1', () => {
  const root = makeHubFixture();
  try {
    const { code } = run(['bogus'], { root });
    assert.equal(code, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('defect: AGENTS.md < 6 sections -> doctor FAIL exit 1', () => {
  const root = makeHubFixture({ agentsSections: 3 });
  try {
    const { code, out } = run(['doctor'], { root });
    assert.equal(code, 1);
    assert.match(out, /RESULT: FAIL/);
    assert.match(out, /AGENTS\.md has 3/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('defect: sidecar .meta.json -> doctor FAIL; removing it -> PASS', () => {
  const root = makeHubFixture({ sidecar: true });
  try {
    const r1 = run(['doctor'], { root });
    assert.equal(r1.code, 1);
    assert.match(r1.out, /sidecar/);
    // fix: remove sidecar
    rmSync(join(root, '.csp/product-spec/modules/MOD-AUTH-1.md.meta.json'));
    const r2 = run(['doctor'], { root });
    assert.equal(r2.code, 0);
    assert.match(r2.out, /RESULT: PASS/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('defect: substantive page without frontmatter -> doctor FAIL', () => {
  const root = makeHubFixture({ noFrontmatter: true });
  try {
    const { code, out } = run(['doctor'], { root });
    assert.equal(code, 1);
    assert.match(out, /frontmatter/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('indirect: locate with no query -> exit 1 usage', () => {
  const root = makeHubFixture();
  try {
    const { code, out } = run(['locate'], { root });
    assert.equal(code, 1);
    assert.match(out, /usage/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('indirect: diff reads content_hash from manifest — stale hash flags "changed"', () => {
  const root = makeHubFixture({ itemHashes: false }); // recorded hash != actual
  try {
    const { code, out } = run(['diff'], { root });
    assert.equal(code, 0);
    assert.match(out, /changed\s+\.csp\/product-spec\/modules\/MOD-AUTH-1\.md/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('cwd-trap: TARGET_ROOT git status has no fixture leakage', () => {
  const status = execFileSync('git', ['-C', ROOT, 'status', '--porcelain'], { encoding: 'utf8' });
  assert.equal(status.includes('csp-hub-'), false);
});
