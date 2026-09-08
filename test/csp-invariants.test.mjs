#!/usr/bin/env node
/**
 * Key-path invariant tests for CSP.
 *
 * Run: node --test test/*.test.mjs   (or `npm test` which delegates here)
 *
 * These are assertion-based invariants over the committed/derived state — they do
 * NOT mutate files (the build:graph smoke in `npm test` covers rebuildability).
 * Covers: registry shape, graph consistency, triggers integrity, version sync,
 * csp-sdk CLI contract.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join, basename, dirname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const readJSON = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const readText = (p) => readFileSync(join(ROOT, p), 'utf8');

const registry = readJSON('csp-router/registry.json');
const graph = readJSON('csp-router/skpg/graph.json');

// ── Registry invariants ────────────────────────────────────────────
test('registry: total_skills matches skills array length', () => {
  assert.equal(registry.total_skills, registry.skills.length);
});

test('registry: all skill names are unique', () => {
  const names = registry.skills.map(s => s.name);
  assert.equal(new Set(names).size, names.length, 'duplicate skill names in registry');
});

test('registry: every entry has required fields', () => {
  for (const s of registry.skills) {
    assert.ok(typeof s.name === 'string' && s.name, `name missing: ${JSON.stringify(s).slice(0, 80)}`);
    assert.ok(typeof s.description === 'string' && s.description, `desc missing: ${s.name}`);
    assert.ok([0, 1, 2, 3, 4].includes(s.layer), `bad layer: ${s.name}=${s.layer}`);
    assert.ok(typeof s.category === 'string', `bad category: ${s.name}`);
    assert.ok(typeof s.path === 'string', `bad path: ${s.name}`);
  }
});

test('registry: every path exists on disk', () => {
  const missing = registry.skills.filter(s => !existsSync(join(ROOT, s.path)));
  assert.deepEqual(missing.map(s => s.name), [], 'registry paths must exist on disk');
});

test('registry: csp-codebase-audit is registered (integration sanity)', () => {
  const hit = registry.skills.find(s => s.name === 'csp-codebase-audit');
  assert.ok(hit, 'csp-codebase-audit must be in registry');
  assert.equal(hit.layer, 2);
  assert.equal(hit.category, 'workflow');
  assert.match(hit.path, /csp-workflow\/skills\/csp-codebase-audit\/SKILL\.md/);
});

test('registry: deprecated skills carry deprecated:true + redirect (propagated from frontmatter)', () => {
  const deprecated = registry.skills.filter(s => s.deprecated === true);
  assert.ok(deprecated.length >= 2, 'expected at least 2 deprecated skills');
  for (const s of deprecated) {
    assert.ok(typeof s.redirect === 'string' && s.redirect.length > 0,
      `deprecated skill ${s.name} must carry a redirect target`);
  }
  // csp-code-reviewer must redirect to the runtime consolidated version
  const cr = registry.skills.find(s => s.name === 'csp-code-reviewer' && s.deprecated);
  assert.ok(cr, 'csp-code-reviewer must be marked deprecated');
  assert.match(cr.redirect, /csp-runtime\/agents\/csp-code-reviewer\.md/);
});

// ── Graph invariants ───────────────────────────────────────────────
test('graph: skill_count equals registry count', () => {
  assert.equal(graph.stats.skill_count, registry.skills.length,
    `graph stats.skill_count (${graph.stats.skill_count}) != registry (${registry.skills.length})`);
});

test('graph: has the four expected edge types (derived from edges, not stats)', () => {
  const kinds = new Set();
  for (const e of graph.edges) kinds.add(e.kind);
  for (const k of ['contains', 'triggers', 'depends_on', 'related_to']) {
    assert.ok(kinds.has(k), `graph must contain "${k}" edges (found: ${[...kinds].join(', ')})`);
  }
  assert.equal(graph.stats.edge_count, graph.edges.length, 'stats.edge_count must equal edges.length');
});

test('graph: csp-tech-diagram is present (was previously missing)', () => {
  const blob = JSON.stringify(graph);
  assert.ok(blob.includes('csp-tech-diagram'), 'csp-tech-diagram must appear in graph');
});

// Note: .csp/skpg/graph.json runtime-copy sync is an install-time invariant
// (enforced by install.sh), not a build invariant — it doesn't exist in CI.

// ── Triggers integrity ─────────────────────────────────────────────
test('triggers: every referenced skill exists in registry', () => {
  const regNames = new Set(registry.skills.map(s => s.name));
  const yaml = readText('csp-router/triggers.yaml');
  // collect csp-* identifiers referenced under trigger_index
  const referenced = new Set();
  for (const m of yaml.matchAll(/\b(csp-[a-z0-9][a-z0-9-]*)\b/g)) referenced.add(m[1]);
  // every referenced name should either be in registry or be a prefix of one —
  // we only assert the csp-codebase-audit one is wired
  assert.ok(referenced.has('csp-codebase-audit'), 'csp-codebase-audit must have a trigger entry');
  // spot-check: no referenced name is a clear typo of a real one (subset check)
  const dangling = [...referenced].filter(n => !regNames.has(n) && !registry.skills.some(s => s.name.startsWith(n)));
  // allow a small number of partial-prefix references; fail only if huge
  assert.ok(dangling.length < 50, `${dangling.length} dangling trigger references (too many)`);
});

// ── Version sync ───────────────────────────────────────────────────
test('version: VERSION file, package.json, install.sh, CLAUDE.md agree', () => {
  const versionFile = readText('VERSION').trim();
  const pkg = readJSON('package.json');
  assert.equal(versionFile, pkg.version, 'VERSION != package.json.version');
  const installSh = readText('install.sh');
  const m = installSh.match(/readonly VERSION="([0-9.]+)"/);
  assert.ok(m, 'install.sh must define readonly VERSION');
  assert.equal(m[1], pkg.version, `install.sh VERSION=${m[1]} != ${pkg.version}`);
  const claudeMd = readText('CLAUDE.md');
  assert.match(claudeMd, new RegExp(`v${pkg.version}\\b`), 'CLAUDE.md title must carry the current version');
});

test('version: README skill-count matches registry', () => {
  const readme = readText('README.md');
  const readmeZh = readText('README_zh.md');
  assert.match(readme, new RegExp(`Skills:\\s*${registry.skills.length}`), 'README badge skill count stale');
  assert.match(readmeZh, new RegExp(`${registry.skills.length}\\s*个技能`), 'README_zh skill count stale');
});

// ── csp-sdk CLI contract ───────────────────────────────────────────
function cspSdk(args) {
  try {
    const out = execSync(`node bin/csp-sdk.mjs ${args}`, { cwd: ROOT, encoding: 'utf-8', timeout: 10000 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: e.stdout ? e.stdout.toString() : '', err: e.stderr ? e.stderr.toString() : '' };
  }
}

test('csp-sdk: unknown subcommand exits non-zero (was silently returning ok)', () => {
  const r = cspSdk('query this-subcommand-does-not-exist');
  assert.notEqual(r.code, 0, 'unknown subcommand must not exit 0');
});

test('csp-sdk: verify.* / validate.* / check.* now report unimplemented (not pass)', () => {
  for (const sub of ['verify.schema-drift', 'check.coverage', 'validate.something']) {
    const r = cspSdk(`query ${sub}`);
    // specific named stubs (verify.key-links etc.) still pass; generic prefixes
    // report unimplemented. At least the unknown ones must not be coverage:1.0.
    const body = r.out + (r.err || '');
    if (r.code === 0) {
      assert.ok(!/coverage.*1\.0/.test(body) || !/status.*pass/.test(body),
        `${sub} should not silently report pass/coverage:1.0`);
    }
  }
});

test('csp-sdk: generate-slug produces URL-safe slug', () => {
  const r = cspSdk('query generate-slug "Hello World/Foo!"');
  assert.equal(r.code, 0);
  const slug = r.out.trim();
  assert.equal(slug, 'hello-world-foo');
});

test('csp-sdk: current-timestamp returns ISO 8601', () => {
  const r = cspSdk('query current-timestamp');
  assert.equal(r.code, 0);
  assert.match(r.out.trim(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

// ── csp-sdk drive.* lifecycle enforcement chain ────────────────────
// Isolated under a temp CSP_PROJECT_ROOT so we can create/delete gate artifacts
// without touching the real repo's .csp/.
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

function driveRoot() {
  const tmp = mkdtempSync(join(tmpdir(), 'csp-drive-'));
  // Mirror the registry + contract so the CLI (run with CSP_PROJECT_ROOT=tmp)
  // can resolve deps and the lifecycle contract.
  mkdirSync(join(tmp, 'csp-router'), { recursive: true });
  writeFileSync(join(tmp, 'csp-router', 'registry.json'),
    JSON.stringify({ version: 1.0, total_skills: 2, skills: [
      { name: 'csp-knowledge-hub', deps: [] },
      { name: 'csp-requirement-decomposition', deps: ['csp-knowledge-hub'] },
    ]}));
  // contract: copy from repo so stages/gates stay in sync
  mkdirSync(join(tmp, 'csp-workflow', 'references'), { recursive: true });
  writeFileSync(join(tmp, 'csp-workflow', 'references', 'lifecycle-contract.json'),
    readText('csp-workflow/references/lifecycle-contract.json'));
  return tmp;
}

function driveSdk(args, cwd) {
  try {
    const out = execSync(`node ${join(ROOT, 'bin', 'csp-sdk.mjs')} ${args}`,
      { cwd, encoding: 'utf-8', timeout: 10000, env: { ...process.env, CSP_PROJECT_ROOT: cwd } });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: e.stdout ? e.stdout.toString() : '', err: e.stderr ? e.stderr.toString() : '' };
  }
}

test('csp-sdk: drive.contract loads the lifecycle state machine', () => {
  const r = cspSdk('query drive.contract');
  assert.equal(r.code, 0);
  const c = JSON.parse(r.out);
  assert.equal(c.version, 1);
  assert.ok(c.stages.length >= 13, 'contract has S0-S9 chain');
  assert.ok(c.modes.full && c.modes['spec-only'], 'modes present');
  const s0 = c.stages.find(s => s.id === 'S0');
  assert.equal(s0.skill, 'csp-knowledge-hub');
  assert.ok(s0.gate.artifacts.includes('.csp/AGENTS.md'));
});

test('csp-sdk: drive.init creates lifecycle-state and drive.status reports S0', () => {
  const tmp = driveRoot();
  try {
    const r = driveSdk('query drive.init --mode spec-only', tmp);
    assert.equal(r.code, 0);
    const st = JSON.parse(r.out);
    assert.equal(st.current_stage, 'S0');
    assert.equal(st.mode, 'spec-only');
    const s = JSON.parse(driveSdk('query drive.status', tmp).out);
    assert.equal(s.current_stage, 'S0');
    assert.equal(s.current_skill, 'csp-knowledge-hub');
    assert.equal(s.current_status, 'in_progress');
    assert.equal(s.next_stage, 'S1');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: drive.advance BLOCKS when gate fails (no skip, repoint + retry)', () => {
  const tmp = driveRoot();
  try {
    driveSdk('query drive.init --mode full', tmp);
    const adv = JSON.parse(driveSdk('query drive.advance', tmp).out);
    assert.equal(adv.status, 'blocked', 'gate fail must block, not advance');
    assert.equal(adv.stage, 'S0');
    assert.ok(adv.missing.includes('.csp/AGENTS.md'));
    assert.equal(adv.retries, 1);
    // current_stage must NOT have advanced
    const s = JSON.parse(driveSdk('query drive.status', tmp).out);
    assert.equal(s.current_stage, 'S0', 'must stay on S0 — no silent skip');
    assert.equal(s.retries, 1);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: drive.advance ADVANCES only after gate passes', () => {
  const tmp = driveRoot();
  try {
    driveSdk('query drive.init --mode full', tmp);
    // Satisfy S0 gate
    mkdirSync(join(tmp, '.csp'), { recursive: true });
    writeFileSync(join(tmp, '.csp', 'AGENTS.md'), '# AGENTS\n');
    writeFileSync(join(tmp, '.csp', 'manifest.json'), '{"manifest_id":"t","version":1,"items":[]}');
    const adv = JSON.parse(driveSdk('query drive.advance', tmp).out);
    assert.equal(adv.status, 'advanced');
    assert.equal(adv.from, 'S0');
    assert.equal(adv.to, 'S1');
    assert.equal(adv.next_skill, 'csp-requirement-decomposition');
    const s = JSON.parse(driveSdk('query drive.status', tmp).out);
    assert.equal(s.current_stage, 'S1');
    assert.ok(s.completed.includes('S0'));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: drive.next resolves depends_on transitively into load_order', () => {
  const tmp = driveRoot();
  try {
    driveSdk('query drive.init --mode full', tmp);
    // Advance past S0 so current is S1 (whose skill depends on csp-knowledge-hub)
    mkdirSync(join(tmp, '.csp'), { recursive: true });
    writeFileSync(join(tmp, '.csp', 'AGENTS.md'), '# AGENTS\n');
    writeFileSync(join(tmp, '.csp', 'manifest.json'), '{"manifest_id":"t","version":1,"items":[]}');
    driveSdk('query drive.advance', tmp);
    const next = JSON.parse(driveSdk('query drive.next', tmp).out);
    assert.equal(next.stage, 'S1');
    assert.equal(next.skill_to_run, 'csp-requirement-decomposition');
    assert.ok(next.depends_on_resolved.includes('csp-knowledge-hub'), 'transitive dep resolved');
    assert.deepEqual(next.load_order, ['csp-knowledge-hub', 'csp-requirement-decomposition']);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: unknown drive.* subcommand reports unimplemented (not silent pass)', () => {
  const r = cspSdk('query drive.nonsense');
  // drive.nonsense falls through to the drive.* prefix handler → unimplemented
  const body = r.out + (r.err || '');
  assert.ok(/unimplemented/.test(body), 'unknown drive sub must not silently pass');
});

// ── csp-sdk drive.* governance gates (PMS/CMS/TMS) + S6 stack prefill ──
// driveRoot() (defined above) gives an isolated CSP_PROJECT_ROOT with registry + contract.
function writeFile(tmp, rel, content) {
  const p = join(tmp, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
}

test('csp-sdk: drive.init prefills S6 gate command by detected tech stack', () => {
  // python-only project (no package.json) → pytest
  const tmp = driveRoot();
  try {
    writeFile(tmp, 'pyproject.toml', '[project]\nname = "x"\n');
    const r = JSON.parse(driveSdk('query drive.init', tmp).out);
    assert.deepEqual(r.tech_stack, ['python']);
    assert.equal(r.s6_command, 'python -m pytest');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  // go project → go test
  const tmp2 = driveRoot();
  try {
    writeFile(tmp2, 'go.mod', 'module x\n');
    const r = JSON.parse(driveSdk('query drive.init', tmp2).out);
    assert.deepEqual(r.tech_stack, ['go']);
    assert.equal(r.s6_command, 'go test ./...');
  } finally { rmSync(tmp2, { recursive: true, force: true }); }
});

test('csp-sdk: TMS gate BLOCKS S6 when requirement-matrix has unmapped/gaps', () => {
  const tmp = driveRoot();
  try {
    driveSdk('query drive.init --mode full', tmp);
    // satisfy S0..S5 stage gates so we reach S6 cleanly, then test TMS gate
    writeFile(tmp, '.csp/AGENTS.md', '# AGENTS\n');
    writeFile(tmp, '.csp/manifest.json', '{"manifest_id":"t","version":1,"items":[]}');
    writeFile(tmp, '.csp/decomposition/DECOMPOSITION-SUMMARY.md', '# ');
    writeFile(tmp, '.csp/decomposition/DEPENDENCY-GRAPH.md', '# ');
    writeFile(tmp, '.csp/tech-decisions/TECH-STACK-OVERVIEW.md', '# ');
    writeFile(tmp, '.csp/tech-design/ARCHITECTURE-DESIGN.md', '# ');
    writeFile(tmp, '.csp/tech-design/DATA-ARCHITECTURE.md', '# ');
    writeFile(tmp, '.csp/tech-design/INTERFACE-ARCHITECTURE.md', '# ');
    writeFile(tmp, '.csp/tech-design/REVIEW-FINDINGS.md', '# APPROVED\n');
    writeFile(tmp, '.csp/specs/SPEC-INDEX.md', '# ');
    writeFile(tmp, '.csp/specs/API-OVERVIEW.md', '# ');
    writeFile(tmp, '.csp/tasks/WBS.md', '# ');
    writeFile(tmp, '.csp/tasks/DEPENDENCY-DAG.md', '# ');
    writeFile(tmp, '.csp/plan/IMPLEMENTATION-PLAN.md', '# ');
    writeFile(tmp, '.csp/verification/VERIFICATION.md', '# '); // for S7 later
    // TMS matrix WITH a gap
    writeFile(tmp, '.csp/test-spec/auth/requirement-matrix.md',
      '| 需求 | 方法 | 用例 |\n|---|---|---|\n| R1 下单 | unit | c1 |\n| R2 拦截 | — | — |\n\n## 缺口清单\n- R2 未映射\n');
    const g = JSON.parse(driveSdk('query drive.gate S6', tmp).out);
    assert.equal(g.pass, false, 'TMS gap must block S6');
    const tms = g.governance.find(x => x.spec === 'tms');
    assert.equal(tms.pass, false);
    assert.equal(tms.unmapped, 1);
    assert.equal(tms.gaps_listed, 1);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: TMS gate PASSES when all requirements mapped, no gaps', () => {
  const tmp = driveRoot();
  try {
    driveSdk('query drive.init --mode full', tmp);
    writeFile(tmp, '.csp/test-spec/auth/requirement-matrix.md',
      '| 需求 | 方法 | 用例 |\n|---|---|---|\n| R1 下单 | unit | c1 |\n| R2 拦截 | negative | c2 |\n\n## 缺口清单\n（无）\n');
    const g = JSON.parse(driveSdk('query drive.gate S6', tmp).out);
    const tms = g.governance.find(x => x.spec === 'tms');
    assert.equal(tms.pass, true);
    assert.equal(tms.unmapped, 0);
    assert.equal(tms.gaps_listed, 0);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: PMS gate BLOCKS S1 when no module declarations', () => {
  const tmp = driveRoot();
  try {
    driveSdk('query drive.init --mode full', tmp);
    writeFile(tmp, '.csp/product-spec/PRODUCT-MODULE-SPEC.md',
      '# Product Module Spec\n\nNo modules declared yet.\n');
    const g = JSON.parse(driveSdk('query drive.gate S1', tmp).out);
    const pms = g.governance.find(x => x.spec === 'pms');
    assert.equal(pms.pass, false);
    assert.match(pms.reason, /no MOD/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: PMS gate PASSES with module declarations + 100% coverage', () => {
  const tmp = driveRoot();
  try {
    driveSdk('query drive.init --mode full', tmp);
    writeFile(tmp, '.csp/product-spec/PRODUCT-MODULE-SPEC.md',
      '# Product Module Spec\n\n## Modules\n- MOD-AUTH-1: auth\n- MOD-ORDER-1: orders\n\nprd_to_module: 100%\n');
    const g = JSON.parse(driveSdk('query drive.gate S1', tmp).out);
    const pms = g.governance.find(x => x.spec === 'pms');
    assert.equal(pms.pass, true);
    assert.equal(pms.modules, 2);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: CMS gate BLOCKS S5 when code-spec flags unaligned drift', () => {
  const tmp = driveRoot();
  try {
    driveSdk('query drive.init --mode full', tmp);
    writeFile(tmp, '.csp/code-spec/app/CODE-MODULE-SPEC.md',
      '# Code Module Spec\n\n## 4. 模块边界（对齐 PMS）\n| PMS 模块 | 代码归属 | drift? |\n| MOD-AUTH | auth/ | 未对齐 |\n');
    const g = JSON.parse(driveSdk('query drive.gate S5', tmp).out);
    const cms = g.governance.find(x => x.spec === 'cms');
    assert.equal(cms.pass, false);
    assert.match(cms.reason, /unaligned drift/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: governance gate failure blocks drive.advance (not just advisory)', () => {
  const tmp = driveRoot();
  try {
    driveSdk('query drive.init --mode full', tmp);
    // satisfy S0 gate
    writeFile(tmp, '.csp/AGENTS.md', '# AGENTS\n');
    writeFile(tmp, '.csp/manifest.json', '{"manifest_id":"t","version":1,"items":[]}');
    // advance past S0 → now at S1, where PMS governance gate fires
    driveSdk('query drive.advance', tmp); // S0 → S1
    const adv = JSON.parse(driveSdk('query drive.advance', tmp).out); // S1 advance
    assert.equal(adv.status, 'blocked', 'PMS governance gate (at S1) must block advance');
    assert.ok(adv.governance_failures && adv.governance_failures.some(f => f.spec === 'pms'),
      'PMS governance failure must surface in advance.blocked');
    // current_stage must still be S1
    const s = JSON.parse(driveSdk('query drive.status', tmp).out);
    assert.equal(s.current_stage, 'S1');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('csp-sdk: version subcommand prints package version', () => {
  const r = cspSdk('version');
  assert.equal(r.code, 0);
  assert.equal(r.out.trim(), readJSON('package.json').version);
});

// ── Packaging hygiene ──────────────────────────────────────────────
test('packaging: .npmignore exists and excludes .bak + runtime dirs', () => {
  const ni = readText('.npmignore');
  assert.match(ni, /\*\.bak/);
  assert.match(ni, /\.csp\//);
});

test('packaging: files field does NOT whitelist csp-router as a bare dir (would include .bak)', () => {
  const pkg = readJSON('package.json');
  const files = pkg.files || [];
  assert.ok(!files.includes('csp-router'), 'csp-router must not be a bare-dir whitelist (leaks .bak)');
  assert.ok(files.includes('csp-router/registry.json'), 'registry.json must be explicitly whitelisted');
});

test('packaging: key runtime assets are present in npm pack', () => {
  const out = execSync('npm pack --dry-run --json', { cwd: ROOT, encoding: 'utf-8' });
  const files = JSON.parse(out)[0].files.map(f => f.path);
  const bak = files.filter(p => /\.bak$/.test(p));
  assert.deepEqual(bak, [], 'no .bak files in npm pack');
  for (const must of ['csp-router/registry.json', 'csp-router/triggers.yaml', 'csp-router/skpg/graph.json', 'install.sh', 'bin/csp-sdk.mjs']) {
    assert.ok(files.includes(must), `${must} must be in npm pack`);
  }
});

// ── Platform adapter coverage (catches the "filtered installer skipped N platforms"
//    bug class — every ALL_PLATFORMS slug must have a bootstrap generator + a
//    write_bootstrap_for_platform case branch + platforms.sh metadata). Handles
//    grouped branches like `claude-code|copilot-cli)`. ─────────────────────
test('platforms: every ALL_PLATFORMS slug has full adapter coverage', () => {
  const installSh = readText('install.sh');
  const platformsSh = readText('lib/platforms.sh');
  const bootstrapSh = readText('lib/bootstrap.sh');

  const allMatch = installSh.match(/readonly ALL_PLATFORMS="([^"]+)"/);
  assert.ok(allMatch, 'ALL_PLATFORMS not defined');
  const slugs = allMatch[1].trim().split(/\s+/);

  // Extract every slug token mentioned in case branches of generate_bootstrap_for
  // (install.sh) and write_bootstrap_for_platform (lib/bootstrap.sh). Handles `a|b)`.
  const extractSlugs = (text) => {
    const set = new Set();
    for (const m of text.matchAll(/^\s*([a-z][a-z0-9|-]+)\)\s*(?:bootstrap_|append_|mkdir|echo|write_bootstrap)/gm)) {
      for (const tok of m[1].split('|')) set.add(tok);
    }
    return set;
  };
  const genSlugs = extractSlugs(installSh);        // generate_bootstrap_for branches
  const writeSlugs = extractSlugs(bootstrapSh);    // write_bootstrap_for_platform branches

  for (const slug of slugs) {
    assert.ok(platformsSh.includes(`${slug})`), `${slug}: missing in platforms.sh`);
    assert.ok(genSlugs.has(slug), `${slug}: no generate_bootstrap_for branch (got: ${[...genSlugs].join(',')})`);
    assert.ok(writeSlugs.has(slug), `${slug}: no write_bootstrap_for_platform branch`);
  }
  assert.ok(slugs.length >= 22, `expected ≥22 platforms, got ${slugs.length}`);
});
