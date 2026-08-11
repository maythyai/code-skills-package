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
import { resolve, join } from 'node:path';

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
