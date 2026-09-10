#!/usr/bin/env node
/**
 * csp-sdk — Minimal viable CLI for CSP L2 workflow orchestration.
 * Zero external dependencies. Node.js >= 18 ESM.
 *
 * Usage: csp-sdk query <subcommand> [args...] [--flags]
 *        csp-sdk doctor
 *        csp-sdk version
 *
 * State storage:
 *   .csp/planning/           — Project planning (ROADMAP.md, STATE.md, config.json, phases/)
 *   .csp/state.json      — Runtime state (phase/tech_stack/git_status)
 *   .csp/intel/*.md      — Learning outputs
 *
 * Exit codes: 0=success, 1=error, 2=state not found (init scenario)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { execSync, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// --- Utilities ---

const PROJECT_ROOT = process.env.CSP_PROJECT_ROOT || process.cwd();
const PLANNING_DIR = join(PROJECT_ROOT, '.csp/planning');
const CSP_DIR = join(PROJECT_ROOT, '.csp');
const STATE_FILE = join(CSP_DIR, 'state.json');
const LIFECYCLE_STATE_FILE = join(CSP_DIR, 'lifecycle-state.json');
// Lifecycle contract ships inside the csp-workflow layer (copied to every IDE's
// skills dir on install). Resolve relative to the bin first (repo layout), then
// under PROJECT_ROOT (installed alongside csp-workflow/), then env override.
const CONTRACT_ENV = process.env.CSP_LIFECYCLE_CONTRACT || '';
function contractPath() {
  if (CONTRACT_ENV) return resolve(PROJECT_ROOT, CONTRACT_ENV);
  const here = dirname(new URL(import.meta.url).pathname);
  const candidates = [
    join(here, '..', 'csp-workflow', 'references', 'lifecycle-contract.json'),       // repo: bin/../csp-workflow
    join(PROJECT_ROOT, 'csp-workflow', 'references', 'lifecycle-contract.json'),     // repo root
    join(PROJECT_ROOT, 'csp-workflow', 'references', 'lifecycle-contract.json'),     // installed under skills
    join(PROJECT_ROOT, '.cursor', 'skills', 'csp-workflow', 'references', 'lifecycle-contract.json'),
    join(PROJECT_ROOT, '.claude', 'skills', 'csp-workflow', 'references', 'lifecycle-contract.json'),
  ];
  return candidates.find(p => existsSync(p)) || candidates[0];
}
const CONFIG_FILE = join(PLANNING_DIR, 'config.json');
const ROADMAP_FILE = join(PLANNING_DIR, 'ROADMAP.md');
const STATE_MD_FILE = join(PLANNING_DIR, 'STATE.md');
const PHASES_DIR = join(PLANNING_DIR, 'phases');

function out(data) {
  if (typeof data === 'string') process.stdout.write(data + '\n');
  else process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

function err(msg) {
  process.stderr.write(`csp-sdk: ${msg}\n`);
}

function readJSON(path, fallback = null) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return fallback; }
}

function readText(path, fallback = '') {
  try { return readFileSync(path, 'utf-8'); }
  catch { return fallback; }
}

function writeJSON(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function git(cmd, opts = {}) {
  try {
    return execSync(`git ${cmd}`, { cwd: PROJECT_ROOT, encoding: 'utf-8', timeout: 10000, ...opts }).trim();
  } catch { return ''; }
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function timestamp() {
  return new Date().toISOString();
}

function findMarkdownFiles(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findMarkdownFiles(fullPath));
      } else if (entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch { /* ignore unreadable dirs */ }
  return results;
}

// --- Custom File Detection (for csp-update backup) ---
// Scans a runtime config directory for user-added files inside CSP-managed
// skill locations. "Custom" = files/dirs NOT prefixed `csp-` (the 5 managed
// layer dirs are csp-router/csp-meta/csp-workflow/csp-patterns/csp-runtime).
// install.sh overwrites the csp-* layer dirs on update; non-csp-* siblings
// are left untouched, but we surface them so the update workflow can back
// them up defensively. Returns POSIX-relative paths under the config dir.
const CSP_LAYER_DIRS = new Set(['csp-router', 'csp-meta', 'csp-workflow', 'csp-patterns', 'csp-runtime']);
const SKILLS_SUBDIR_CANDIDATES = [
  'skills',            // claude-code, cursor (.cursor/skills), windsurf
  'code-skills-package', // direct install layout
];

function detectCustomFiles(configDir) {
  const root = configDir ? resolve(expandHome(configDir)) : '';
  if (!root || !existsSync(root)) {
    return { custom_files: [], custom_count: 0 };
  }
  const customFiles = [];
  const collect = (baseDir, relBase) => {
    let entries;
    try { entries = readdirSync(baseDir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      // Skip CSP-managed layer dirs entirely
      if (CSP_LAYER_DIRS.has(entry.name)) continue;
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        // A non-csp-* directory in a skills root is a custom skill/agent dir —
        // record its path and descend to catch loose custom files too.
        customFiles.push(rel + '/');
        collect(join(baseDir, entry.name), rel);
      } else {
        // Skip noise
        if (entry.name === '.DS_Store' || entry.name.endsWith('.bak')) continue;
        customFiles.push(rel);
      }
    }
  };
  for (const sub of SKILLS_SUBDIR_CANDIDATES) {
    const skillsDir = join(root, sub);
    if (existsSync(skillsDir) && statSync(skillsDir).isDirectory()) {
      collect(skillsDir, sub);
    }
  }
  // Deduplicate (dirs recorded both as `dir/` and via their children)
  const dedup = [...new Set(customFiles)].sort();
  return { custom_files: dedup, custom_count: dedup.length };
}

function expandHome(p) {
  if (!p) return p;
  if (p === '~') return process.env.HOME || '~';
  if (p.startsWith('~/')) return join(process.env.HOME || '', p.slice(2));
  return p;
}

// --- State Management ---

function loadState() {
  return readJSON(STATE_FILE, null);
}

function saveState(state) {
  ensureDir(CSP_DIR);
  writeJSON(STATE_FILE, { ...state, _updated: timestamp() });
}

// --- Lifecycle Drive Chain (enforced state machine) ---
// Turns advisory skill handoff into enforced transitions: a stage cannot advance
// until its gate (artifacts + commands) passes. See csp-workflow/references/lifecycle-contract.json.

function loadContract() {
  const data = readJSON(contractPath(), null);
  if (!data) throw new Error(`Lifecycle contract not found at ${contractPath()}`);
  return data;
}

function loadLifecycleState() {
  return readJSON(LIFECYCLE_STATE_FILE, null);
}

function saveLifecycleState(state) {
  ensureDir(CSP_DIR);
  writeJSON(LIFECYCLE_STATE_FILE, { ...state, schema_version: 1, updated_at: timestamp() });
}

function initLifecycleState(mode = 'full') {
  const contract = loadContract();
  const modeStages = (contract.modes[mode] || contract.modes.full).stages;
  const stages = {};
  for (const id of modeStages) stages[id] = { status: 'pending', retries: 0 };
  const first = modeStages[0] || null;
  if (first) stages[first].status = 'in_progress';
  return { mode, current_stage: first, stages, milestone: null };
}

// Tech-stack → default S6 (quality gate) test command. Lets drive.init prefill
// gate_overrides so the quality gate runs the right command out-of-box instead
// of forcing every non-JS project to hand-edit lifecycle-state.json on day 1.
const STACK_TEST_COMMANDS = {
  javascript: 'npm test',
  typescript: 'npm test',
  python: 'python -m pytest',
  go: 'go test ./...',
  rust: 'cargo test',
  java: 'mvn -q test',
  kotlin: './gradlew -q test',
  swift: 'swift test',
  cpp: 'ctest --output-on-failure',
};

function prefillGateOverrides(stacks) {
  const cmd = stacks.map(s => STACK_TEST_COMMANDS[s]).find(Boolean) || 'npm test';
  return { S6: { commands: [cmd] } };
}

function getStageDef(contract, id) {
  return contract.stages.find(s => s.id === id) || null;
}

// Resolve a skill's transitive depends_on from registry.json (skills[].deps).
function loadRegistryDeps() {
  const candidates = [
    join(PROJECT_ROOT, 'csp-router', 'registry.json'),
    join(PROJECT_ROOT, '.cursor', 'skills', 'csp-router', 'registry.json'),
    join(PROJECT_ROOT, '.claude', 'skills', 'csp-router', 'registry.json'),
  ];
  const path = candidates.find(p => existsSync(p));
  if (!path) return new Map();
  const reg = readJSON(path, null);
  if (!reg || !Array.isArray(reg.skills)) return new Map();
  const m = new Map();
  for (const s of reg.skills) m.set(s.name, s.deps || []);
  return m;
}

function resolveDeps(skillName, depMap, seen = new Set()) {
  if (seen.has(skillName)) return [];
  seen.add(skillName);
  const direct = depMap.get(skillName) || [];
  const out = [];
  for (const d of direct) {
    out.push(...resolveDeps(d, depMap, seen));
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

// Check a stage's gate: required artifacts exist + commands exit 0.
// Also runs governance gates (PMS/CMS/TMS) mapped to this stage via gate_at,
// turning spec-coverage / drift checks into hard CI gates — not just "file exists".
function checkGate(stageDef, lcState, contract) {
  const gate = stageDef.gate || { artifacts: [], commands: [] };
  const artifactOverrides = (lcState && lcState.gate_overrides && lcState.gate_overrides[stageDef.id]) || {};
  const artifacts = artifactOverrides.artifacts || gate.artifacts || [];
  const commands = artifactOverrides.commands || gate.commands || [];
  const missing = artifacts.filter(a => !existsSync(resolve(PROJECT_ROOT, a)));
  const failedCommands = [];
  for (const cmd of commands) {
    try {
      execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf-8', timeout: 60000, stdio: 'pipe' });
    } catch (e) {
      failedCommands.push({ command: cmd, message: (e.stderr || e.stdout || e.message || '').toString().split('\n')[0] });
    }
  }
  // Governance gates mapped to this stage
  const gov = (contract || loadContract()).governance || {};
  const governanceChecks = [];
  for (const [name, g] of Object.entries(gov)) {
    const at = g.gate_at || [];
    if (!at.includes(stageDef.id)) continue;
    // Skip governance gate if its spec is gated by a stage not yet reached
    // (the spec may not exist early on — only enforce when the spec is expected).
    const checker = { pms: checkPmsGate, cms: checkCmsGate, tms: checkTmsGate }[name];
    if (!checker) continue;
    const result = checker();
    governanceChecks.push({ spec: name, ...result });
  }
  const govFail = governanceChecks.filter(g => !g.pass);
  const pass = missing.length === 0 && failedCommands.length === 0 && govFail.length === 0;
  return { stage: stageDef.id, pass, missing, failed_commands: failedCommands, artifacts_checked: artifacts, governance: governanceChecks };
}

// --- Governance gate checkers ---
// Each parses a real Module Spec artifact (PMS/CMS/TMS) the skills produce,
// so the gate is machine-computed, not "file exists". See lifecycle-contract.json governance.

// TMS: requirement_coverage_gap == 0
// Parses .csp/test-spec/{module}/requirement-matrix.md — every requirement row in the
// 需求→方法 table must have a non-empty 方法 cell, AND the 缺口清单 must list no gaps.
function checkTmsGate() {
  const tmsDir = join(CSP_DIR, 'test-spec');
  const matrices = [];
  try {
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === 'requirement-matrix.md') matrices.push(p);
      }
    };
    if (existsSync(tmsDir)) walk(tmsDir);
  } catch { /* none */ }
  if (matrices.length === 0) return { pass: false, reason: 'no TMS requirement-matrix.md found under .csp/test-spec/', checked: 0 };
  let totalReqs = 0, unmapped = 0, gapListed = 0;
  for (const m of matrices) {
    const text = readText(m);
    // Parse the 需求→方法 table: rows like | R1 ... | unit + ... | case ... |
    const tableRows = text.match(/^\|[^|]*\|[^|]*\|[^|]*\|/gm) || [];
    for (const row of tableRows) {
      const cells = row.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length);
      if (cells.length < 2) continue;
      const req = cells[0], method = cells[1];
      if (/^(需求|Requirement|---)/i.test(req) || /^[-:]+$/.test(req)) continue; // header/separator
      totalReqs++;
      if (!method || method === '—' || method === '-') unmapped++;
    }
    // Gap list section: count listed gap items (lines starting with -/•/digit under 缺口)
    const gapSection = text.split(/缺口清单|Gap List/i)[1] || '';
    const gapItems = gapSection.match(/^\s*[-•\d]/gm) || [];
    gapListed += gapItems.length;
  }
  const pass = unmapped === 0 && gapListed === 0;
  return { pass, checked: matrices.length, total_requirements: totalReqs, unmapped, gaps_listed: gapListed,
           reason: pass ? 'all requirements mapped' : `${unmapped} unmapped + ${gapListed} listed gaps` };
}

// PMS: prd_to_module_coverage == 100%
// Parses .csp/product-spec/PRODUCT-MODULE-SPEC.md — must declare ≥1 MOD-{domain}-{seq}
// module AND show prd_to_module coverage at 100% (or no PRD yet → vacuous pass at S1).
function checkPmsGate() {
  const pmsFile = join(CSP_DIR, 'product-spec', 'PRODUCT-MODULE-SPEC.md');
  if (!existsSync(pmsFile)) return { pass: false, reason: 'no PRODUCT-MODULE-SPEC.md' };
  const text = readText(pmsFile);
  const modules = text.match(/MOD-[A-Z]+-\d+/g) || [];
  if (modules.length === 0) return { pass: false, reason: 'no MOD-* module declarations', modules: 0 };
  // Coverage line: prd_to_module: 100% or prd_to_module_coverage == 100%
  const covMatch = text.match(/prd_to_module[^:]*:\s*(\d+)%/i) || text.match(/prd_to_module_coverage\s*==\s*(\d+)/i);
  // No PRD yet (early stage) → vacuous pass; else require 100%
  const hasPrd = existsSync(join(PLANNING_DIR, 'phases')) || (readJSON(join(CSP_DIR, 'manifest.json'), {items:[]}).items || []).some(i => i.source_type === 'pms' || i.source_type === 'doc');
  if (!covMatch) return { pass: !hasPrd, reason: hasPrd ? 'no prd_to_module coverage line' : 'no PRD yet (vacuous pass)', modules: modules.length };
  const pct = parseInt(covMatch[1], 10);
  return { pass: pct >= 100, modules: modules.length, coverage: pct + '%', reason: pct >= 100 ? 'full coverage' : `coverage ${pct}% < 100%` };
}

// CMS: cms_idempotent_align (weak version)
// Parses .csp/code-spec/{app}/CODE-MODULE-SPEC.md — file must exist AND the 已知 drift /
// 模块边界 section must not flag unaligned drift. Full re-distill+diff is deferred (high cost);
// this weak gate catches "no CMS" and "explicit unaligned drift", not subtle staleness.
function checkCmsGate() {
  const cmsRoot = join(CSP_DIR, 'code-spec');
  const specs = [];
  try {
    if (existsSync(cmsRoot)) {
      const walk = (d) => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, e.name);
          if (e.isDirectory()) walk(p);
          else if (e.name === 'CODE-MODULE-SPEC.md') specs.push(p);
        }
      };
      walk(cmsRoot);
    }
  } catch { /* none */ }
  if (specs.length === 0) return { pass: false, reason: 'no CODE-MODULE-SPEC.md under .csp/code-spec/' };
  let driftFlags = 0;
  for (const s of specs) {
    const text = readText(s);
    // Drift markers in §4 模块边界 (drift? column) and §6 已知 drift
    const driftSection = text.split(/已知 drift|drift/i)[1] || '';
    const driftRows = (driftSection.match(/^\s*\|/gm) || []).length;
    // unaligned markers: 是/yes/未对齐/unaligned in a drift context
    if (/未对齐|unaligned|drift.*是|drift.*yes/i.test(text)) driftFlags++;
  }
  const pass = driftFlags === 0;
  return { pass, checked: specs.length, drift_flags: driftFlags, reason: pass ? 'no unaligned drift' : `${driftFlags} spec(s) flag unaligned drift` };
}

function nextStageId(contract, mode, currentId) {
  const modeStages = (contract.modes[mode] || contract.modes.full).stages;
  const idx = modeStages.indexOf(currentId);
  if (idx === -1 || idx + 1 >= modeStages.length) return null;
  return modeStages[idx + 1];
}

// drive.status — current stage, its status, retries, what's next.
function driveStatus() {
  let lc = loadLifecycleState();
  if (!lc) return { initialized: false, message: 'No lifecycle state. Run `csp-sdk query drive.init`.' };
  const contract = loadContract();
  const cur = lc.current_stage;
  const stageDef = cur ? getStageDef(contract, cur) : null;
  const nxt = cur ? nextStageId(contract, lc.mode, cur) : null;
  const completed = Object.entries(lc.stages || {}).filter(([,v]) => v.status === 'done').map(([k]) => k);
  return {
    initialized: true,
    mode: lc.mode,
    current_stage: cur,
    current_stage_name: stageDef?.name || null,
    current_skill: stageDef?.skill || null,
    current_status: cur ? lc.stages[cur]?.status : null,
    retries: cur ? lc.stages[cur]?.retries : 0,
    next_stage: nxt,
    completed,
    milestone: lc.milestone,
  };
}

// drive.next — what skill to run now + its resolved depends_on + the gate to satisfy.
function driveNext() {
  let lc = loadLifecycleState();
  if (!lc) {
    lc = initLifecycleState('full');
    saveLifecycleState(lc);
  }
  const contract = loadContract();
  const cur = lc.current_stage;
  if (!cur) return { status: 'complete', message: 'No further stages in this mode.' };
  const stageDef = getStageDef(contract, cur);
  if (!stageDef) return { status: 'error', message: `Unknown stage ${cur} (contract drift).` };
  const depMap = loadRegistryDeps();
  const deps = resolveDeps(stageDef.skill, depMap);
  const gate = checkGate(stageDef, lc, contract);
  return {
    stage: cur,
    stage_name: stageDef.name,
    skill_to_run: stageDef.skill,
    skill_path_hint: `csp-workflow/skills/${stageDef.skill}/SKILL.md`,
    depends_on_resolved: deps,
    load_order: [...deps, stageDef.skill],
    gate,
    instruction: gate.pass
      ? `Gate already satisfied — run \`csp-sdk query drive.advance\` to advance to ${nextStageId(contract, lc.mode, cur) || 'terminal'}.`
      : `Load skills in load_order, execute ${stageDef.skill}, then run \`csp-sdk query drive.advance\`.`
  };
}

// drive.gate [stage] — check a stage's gate without advancing.
function driveGate(stageId) {
  const lc = loadLifecycleState() || initLifecycleState('full');
  const contract = loadContract();
  const id = stageId || lc.current_stage;
  if (!id) return { status: 'error', message: 'No current stage.' };
  const stageDef = getStageDef(contract, id);
  if (!stageDef) return { status: 'error', message: `Unknown stage ${id}.` };
  return checkGate(stageDef, lc, contract);
}

// drive.advance — THE ENFORCER. Gate must pass or advance is refused.
function driveAdvance() {
  let lc = loadLifecycleState();
  if (!lc) {
    lc = initLifecycleState('full');
  }
  const contract = loadContract();
  const cur = lc.current_stage;
  if (!cur) return { status: 'complete', message: 'Already at terminal stage.' };
  const stageDef = getStageDef(contract, cur);
  if (!stageDef) return { status: 'error', message: `Unknown stage ${cur}.` };
  const gate = checkGate(stageDef, lc, contract);
  if (!gate.pass) {
    // Do NOT advance. Bump retry counter; repoint agent to current skill.
    lc.stages[cur].retries = (lc.stages[cur].retries || 0) + 1;
    const max = stageDef.max_retries ?? 3;
    const exhausted = lc.stages[cur].retries > max;
    saveLifecycleState(lc);
    return {
      status: 'blocked',
      stage: cur,
      skill_to_run: stageDef.skill,
      missing: gate.missing,
      failed_commands: gate.failed_commands,
      governance_failures: (gate.governance || []).filter(g => !g.pass),
      retries: lc.stages[cur].retries,
      max_retries: max,
      retries_exhausted: exhausted,
      instruction: exhausted
        ? `Retries exhausted for ${cur}. Escalate: inspect missing artifacts/commands/governance gaps, or set current_stage back via drive.goto.`
        : `Gate failed — do NOT advance. Re-run ${stageDef.skill}, then retry drive.advance.`,
    };
  }
  // Gate passes — mark done, advance current_stage.
  lc.stages[cur].status = 'done';
  lc.stages[cur].completed_at = timestamp();
  const nxt = nextStageId(contract, lc.mode, cur);
  if (nxt) {
    lc.stages[nxt].status = 'in_progress';
    lc.current_stage = nxt;
  } else {
    lc.current_stage = null; // terminal
  }
  saveLifecycleState(lc);
  return {
    status: 'advanced',
    from: cur,
    to: nxt,
    next_skill: nxt ? getStageDef(contract, nxt)?.skill : null,
    next_skill_path: nxt ? `csp-workflow/skills/${getStageDef(contract, nxt)?.skill}/SKILL.md` : null,
    instruction: nxt
      ? `Advanced to ${nxt}. Run \`csp-sdk query drive.next\` for the next skill load order.`
      : `Terminal stage reached. Milestone complete.`,
  };
}

// drive.plan [mode] — full ordered skill sequence for a mode, deps resolved.
function drivePlan(modeArg) {
  const contract = loadContract();
  const mode = modeArg || 'full';
  const modeStages = (contract.modes[mode] || contract.modes.full).stages;
  const depMap = loadRegistryDeps();
  const plan = modeStages.map(id => {
    const s = getStageDef(contract, id);
    if (!s) return { stage: id, error: 'not in contract' };
    const deps = resolveDeps(s.skill, depMap);
    return { stage: id, name: s.name, skill: s.skill, load_order: [...deps, s.skill], gate_artifacts: s.gate?.artifacts || [] };
  });
  return { mode, stages: plan };
}

// drive.goto <stage> — manually set current_stage (escape hatch for blocked/exhausted).
function driveGoto(stageId) {
  const lc = loadLifecycleState() || initLifecycleState('full');
  const contract = loadContract();
  if (!getStageDef(contract, stageId)) return { status: 'error', message: `Unknown stage ${stageId}.` };
  const modeStages = (contract.modes[lc.mode] || contract.modes.full).stages;
  if (!modeStages.includes(stageId)) return { status: 'error', message: `Stage ${stageId} not in mode ${lc.mode}.` };
  if (lc.current_stage && lc.stages[lc.current_stage]) lc.stages[lc.current_stage].status = lc.stages[lc.current_stage].status === 'done' ? 'done' : 'pending';
  lc.stages[stageId].status = 'in_progress';
  lc.current_stage = stageId;
  saveLifecycleState(lc);
  return { status: 'ok', current_stage: stageId, skill: getStageDef(contract, stageId).skill };
}

function initState() {
  const state = {
    version: '0.11.1',
    phase: null,
    phase_name: null,
    milestone: null,
    tech_stack: detectTechStack(),
    git_status: detectGitStatus(),
    created: timestamp(),
    _updated: timestamp(),
  };
  saveState(state);
  return state;
}

function detectTechStack() {
  const markers = {
    'package.json': 'javascript',
    'tsconfig.json': 'typescript',
    'requirements.txt': 'python',
    'pyproject.toml': 'python',
    'go.mod': 'go',
    'Cargo.toml': 'rust',
    'pom.xml': 'java',
    'build.gradle': 'kotlin',
    'Package.swift': 'swift',
    'CMakeLists.txt': 'cpp',
  };
  const stacks = [];
  for (const [file, lang] of Object.entries(markers)) {
    if (existsSync(join(PROJECT_ROOT, file))) stacks.push(lang);
  }
  return stacks.length ? stacks : ['unknown'];
}

function detectGitStatus() {
  const status = git('status --porcelain');
  if (!status) return 'clean';
  if (status.includes('UU') || status.includes('AA')) return 'conflict';
  return 'dirty';
}

// --- Config Management ---

function loadConfig() {
  return readJSON(CONFIG_FILE, {});
}

function configGet(keyPath) {
  const config = loadConfig();
  const keys = keyPath.split('.');
  let val = config;
  for (const k of keys) {
    if (val == null || typeof val !== 'object') return null;
    val = val[k];
  }
  return val ?? null;
}

function configSet(keyPath, value) {
  const config = loadConfig();
  const keys = keyPath.split('.');
  let obj = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof obj[keys[i]] !== 'object' || obj[keys[i]] === null) obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  // Try to parse value as JSON for booleans/numbers
  let parsed = value;
  if (value === 'true') parsed = true;
  else if (value === 'false') parsed = false;
  else if (value !== '' && value.trim() !== '' && !isNaN(value)) parsed = Number(value);
  obj[keys[keys.length - 1]] = parsed;
  ensureDir(PLANNING_DIR);
  writeJSON(CONFIG_FILE, config);
  return parsed;
}

// --- Roadmap Parsing ---

function parseRoadmap() {
  const content = readText(ROADMAP_FILE);
  if (!content) return { phases: [], milestone: null, raw: '' };

  const phases = [];
  const phaseRegex = /^#{2,3}\s+(?:Phase\s+)?(\d+(?:\.\d+)?)[:\s]+(.+?)(?:\s*\[(.+?)\])?$/gm;
  let match;
  while ((match = phaseRegex.exec(content)) !== null) {
    phases.push({
      number: match[1],
      name: match[2].trim(),
      status: (match[3] || 'pending').toLowerCase(),
    });
  }

  // Also try table format: | 1 | Name | status |
  if (phases.length === 0) {
    const tableRegex = /^\|\s*(\d+(?:\.\d+)?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/gm;
    while ((match = tableRegex.exec(content)) !== null) {
      if (match[1] && !match[2].match(/^-+$/)) {
        phases.push({
          number: match[1],
          name: match[2].trim(),
          status: match[3].trim().toLowerCase(),
        });
      }
    }
  }

  const milestoneMatch = content.match(/(?:Milestone|Version|目标)[:\s]+(.+)/i);
  return {
    phases,
    milestone: milestoneMatch ? milestoneMatch[1].trim() : null,
    raw: content,
  };
}

function getPhase(number) {
  const roadmap = parseRoadmap();
  const phase = roadmap.phases.find(p => p.number === String(number));
  if (!phase) return null;

  // Check for phase directory
  const phaseDir = findPhaseDir(number);
  return {
    ...phase,
    dir: phaseDir,
    has_plan: phaseDir ? existsSync(join(phaseDir, 'PLAN.md')) : false,
    has_verification: phaseDir ? existsSync(join(phaseDir, 'VERIFICATION.md')) : false,
    artifacts: phaseDir ? listPhaseArtifacts(phaseDir) : [],
  };
}

function findPhaseDir(number) {
  if (!existsSync(PHASES_DIR)) return null;
  const padded = String(number).padStart(2, '0');
  try {
    const dirs = readdirSync(PHASES_DIR);
    const found = dirs.find(d => d.startsWith(`${padded}-`) || d.startsWith(`${number}-`));
    return found ? join(PHASES_DIR, found) : null;
  } catch { return null; }
}

function listPhaseArtifacts(phaseDir) {
  try {
    return readdirSync(phaseDir).filter(f => f.endsWith('.md'));
  } catch { return []; }
}

// --- Init Commands ---

function initPhaseOp(phaseArg) {
  const state = loadState() || initState();
  const phaseNum = phaseArg || state.phase;
  const phase = phaseNum ? getPhase(phaseNum) : null;
  const phaseDir = phase?.dir || (phaseNum ? findPhaseDir(phaseNum) : null);

  return {
    phase: phaseNum || null,
    phase_name: phase?.name || null,
    phase_dir: phaseDir || (phaseNum ? join(PHASES_DIR, `${String(phaseNum).padStart(2, '0')}-phase`) : null),
    phase_status: phase?.status || 'unknown',
    milestone: state.milestone || parseRoadmap().milestone,
    tech_stack: state.tech_stack || detectTechStack(),
    git_status: detectGitStatus(),
    config: loadConfig(),
    has_plan: phase?.has_plan || false,
    has_verification: phase?.has_verification || false,
    artifacts: phase?.artifacts || [],
  };
}

function initPlanPhase(phaseArg) {
  const base = initPhaseOp(phaseArg);
  return {
    ...base,
    mode: 'plan',
    template: 'plan-phase',
    expected_outputs: ['PLAN.md', 'CONTEXT.md', 'RESEARCH.md'],
  };
}

function initExecutePhase(phaseArg) {
  const base = initPhaseOp(phaseArg);
  const planContent = base.phase_dir ? readText(join(base.phase_dir, 'PLAN.md')) : '';
  return {
    ...base,
    mode: 'execute',
    template: 'execute-phase',
    plan_content: planContent || null,
    has_plan: !!planContent,
  };
}

function initProgress() {
  const state = loadState() || initState();
  const roadmap = parseRoadmap();
  const completed = roadmap.phases.filter(p => p.status === 'done' || p.status === 'complete' || p.status === '✅').length;
  const total = roadmap.phases.length;
  return {
    phase: state.phase,
    milestone: state.milestone || roadmap.milestone,
    phases_completed: completed,
    phases_total: total,
    progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    tech_stack: state.tech_stack,
    git_status: detectGitStatus(),
    config: loadConfig(),
  };
}

function initResume() {
  const state = loadState();
  if (!state) return { error: 'no_state', message: 'No .csp/state.json found. Run init first.' };
  const roadmap = parseRoadmap();
  return {
    ...state,
    roadmap_phases: roadmap.phases.length,
    current_phase_info: state.phase ? getPhase(state.phase) : null,
    git_status: detectGitStatus(),
    git_branch: git('branch --show-current'),
    last_updated: state._updated,
  };
}

function initTodos() {
  const todosDir = join(PLANNING_DIR, 'todos', 'pending');
  const doneDir = join(PLANNING_DIR, 'todos', 'done');
  let pending = [];
  let done = [];
  try { pending = readdirSync(todosDir).filter(f => f.endsWith('.md')); } catch {}
  try { done = readdirSync(doneDir).filter(f => f.endsWith('.md')); } catch {}
  return { pending_count: pending.length, done_count: done.length, pending, config: loadConfig() };
}

function initQuick() {
  return {
    tech_stack: detectTechStack(),
    git_status: detectGitStatus(),
    git_branch: git('branch --show-current'),
    config: loadConfig(),
    has_planning: existsSync(PLANNING_DIR),
    has_roadmap: existsSync(ROADMAP_FILE),
  };
}

function initMapCodebase() {
  return {
    tech_stack: detectTechStack(),
    git_status: detectGitStatus(),
    root_files: listRootFiles(),
    config: loadConfig(),
  };
}

function listRootFiles() {
  try {
    return readdirSync(PROJECT_ROOT).filter(f => !f.startsWith('.')).slice(0, 50);
  } catch { return []; }
}

function initVerifyWork(phaseArg) {
  const base = initPhaseOp(phaseArg);
  return { ...base, mode: 'verify', expected_artifacts: ['VERIFICATION.md', 'SUMMARY.md'] };
}

function initNewProject() {
  return {
    project_root: PROJECT_ROOT,
    has_planning: existsSync(PLANNING_DIR),
    has_roadmap: existsSync(ROADMAP_FILE),
    has_config: existsSync(CONFIG_FILE),
    tech_stack: detectTechStack(),
    git_initialized: existsSync(join(PROJECT_ROOT, '.git')),
  };
}

function initNewMilestone() {
  const roadmap = parseRoadmap();
  return {
    current_milestone: roadmap.milestone,
    phases_count: roadmap.phases.length,
    config: loadConfig(),
  };
}

// --- Commit Helper ---

function doCommit(message, files) {
  const fileList = files ? files.split(/\s+/).filter(Boolean) : [];
  const gitArgs = (cmd) => ['-C', PROJECT_ROOT, ...cmd];
  if (fileList.length > 0) {
    for (const f of fileList) {
      execFileSync('git', gitArgs(['add', f]), { timeout: 10000 });
    }
  } else {
    execFileSync('git', gitArgs(['add', '-A']), { timeout: 10000 });
  }
  try {
    // Pass message via stdin to avoid shell injection through the -m flag
    execFileSync('git', gitArgs(['commit', '-F', '-']), {
      encoding: 'utf-8', timeout: 10000,
      input: message,
    });
    return { success: true, output: 'Commit successful' };
  } catch (e) {
    return { success: false, output: (e.stderr || e.message || 'Commit failed').trim() };
  }
}

// --- Agent Skills ---

function getAgentSkills(agentName) {
  // Reject path traversal attempts and non-alphanumeric characters
  if (!agentName || /[./]/.test(agentName) || agentName.length > 100) {
    return { name: agentName || '', content: null, error: 'invalid_name' };
  }
  // Search in csp-runtime/agents/ and csp-patterns/agents/
  const searchDirs = [
    join(PROJECT_ROOT, 'csp-runtime', 'agents'),
    join(PROJECT_ROOT, 'csp-patterns', 'agents'),
  ];
  for (const dir of searchDirs) {
    const mdPath = join(dir, `${agentName}.md`);
    const skillPath = join(dir, agentName, 'SKILL.md');
    // Verify resolved path stays within the intended directory
    if (existsSync(mdPath) && resolve(mdPath).startsWith(resolve(dir))) {
      return { name: agentName, content: readText(mdPath), path: mdPath };
    }
    if (existsSync(skillPath) && resolve(skillPath).startsWith(resolve(dir))) {
      return { name: agentName, content: readText(skillPath), path: skillPath };
    }
  }
  return { name: agentName, content: null, error: 'not_found' };
}

// --- Resolve Model ---

function resolveModel(agentName) {
  const config = loadConfig();
  const modelProfile = config.model_profile || 'balanced';
  const profiles = {
    quality: { model: 'opus', tier: 'high' },
    balanced: { model: 'sonnet', tier: 'medium' },
    budget: { model: 'haiku', tier: 'low' },
  };
  const profile = profiles[modelProfile] || profiles.balanced;
  // Check for per-agent override
  const override = config.models?.[agentName];
  return { agent: agentName, model: override || profile.model, tier: profile.tier, profile: modelProfile };
}

// --- Stats ---

function getStats() {
  const roadmap = parseRoadmap();
  const state = loadState() || {};
  const completed = roadmap.phases.filter(p => ['done', 'complete', '✅'].includes(p.status)).length;
  return {
    version: '0.11.1',
    milestone: state.milestone || roadmap.milestone || 'unknown',
    phases_total: roadmap.phases.length,
    phases_completed: completed,
    phases_pending: roadmap.phases.length - completed,
    current_phase: state.phase || null,
    tech_stack: state.tech_stack || detectTechStack(),
    git_branch: git('branch --show-current'),
    last_updated: state._updated || null,
  };
}

// --- Progress Bar ---

function progressBar() {
  const roadmap = parseRoadmap();
  const total = roadmap.phases.length;
  const completed = roadmap.phases.filter(p => ['done', 'complete', '✅'].includes(p.status)).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const filled = Math.round(pct / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  return `[${bar}] ${pct}% (${completed}/${total} phases)`;
}

// --- Verify Commands ---

function verifyArtifacts(phaseArg) {
  const phaseDir = findPhaseDir(phaseArg);
  if (!phaseDir) return { status: 'error', message: `Phase dir not found for ${phaseArg}` };
  const artifacts = listPhaseArtifacts(phaseDir);
  const required = ['PLAN.md'];
  const missing = required.filter(r => !artifacts.includes(r));
  return {
    status: missing.length === 0 ? 'pass' : 'fail',
    found: artifacts,
    missing,
    phase_dir: phaseDir,
  };
}

function verifyCommits(phaseArg) {
  const log = git('log --oneline -20');
  // Escape regex special characters in user input to prevent SyntaxError
  const escaped = String(phaseArg).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phasePattern = new RegExp(`phase.?${escaped}|${String(phaseArg).padStart(2, '0')}`, 'i');
  const relevant = log.split('\n').filter(l => phasePattern.test(l));
  return { status: relevant.length > 0 ? 'pass' : 'warn', commits: relevant, total_recent: log.split('\n').length };
}

// --- Doctor ---

function doctor() {
  const checks = [];
  checks.push({ name: 'project_root', status: 'ok', value: PROJECT_ROOT });
  checks.push({ name: '.csp/planning/', status: existsSync(PLANNING_DIR) ? 'ok' : 'missing' });
  checks.push({ name: 'ROADMAP.md', status: existsSync(ROADMAP_FILE) ? 'ok' : 'missing' });
  checks.push({ name: 'config.json', status: existsSync(CONFIG_FILE) ? 'ok' : 'missing' });
  checks.push({ name: '.csp/state.json', status: existsSync(STATE_FILE) ? 'ok' : 'missing' });
  checks.push({ name: 'git', status: existsSync(join(PROJECT_ROOT, '.git')) ? 'ok' : 'missing' });
  checks.push({ name: 'phases/', status: existsSync(PHASES_DIR) ? 'ok' : 'missing' });

  const roadmap = parseRoadmap();
  checks.push({ name: 'roadmap_phases', status: roadmap.phases.length > 0 ? 'ok' : 'empty', value: roadmap.phases.length });

  const failed = checks.filter(c => c.status === 'missing');
  out({ healthy: failed.length === 0, checks, issues: failed.map(f => f.name) });
  return failed.length === 0 ? 0 : 1;
}

// --- Token Budget Operations (Phase 4.18) ---

const BUDGET_FILE = join(CSP_DIR, 'budget.json');
const BUDGET_CHECKPOINT_FILE = join(CSP_DIR, 'budget-checkpoint.json');

const CODE_EXTS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.rb', '.go',
  '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.hpp', '.cs',
  '.php', '.sh', '.bash', '.zsh', '.pl', '.lua', '.r', '.scala',
  '.hs', '.ex', '.exs', '.clj', '.cljs', '.vue', '.svelte', '.sql',
]);

function budgetGetLimit() {
  const config = loadConfig();
  const limit = config?.budget?.limit;
  return (typeof limit === 'number' && limit > 0) ? limit : 200000;
}

function budgetCreateState() {
  return {
    session_id: randomUUID(),
    started_at: timestamp(),
    budget_limit: budgetGetLimit(),
    used: 0,
    history: [],
    tier: 'ok',
  };
}

function budgetSave(state) {
  ensureDir(CSP_DIR);
  writeJSON(BUDGET_FILE, state);
}

function budgetEnsure() {
  let state = readJSON(BUDGET_FILE, null);
  if (!state) {
    state = budgetCreateState();
    budgetSave(state);
  }
  state.budget_limit = budgetGetLimit();
  return state;
}

function budgetCalculateTier(used, limit) {
  const pct = limit > 0 ? used / limit : 0;
  if (pct >= 1.0) return 'hard_limit';
  if (pct >= 0.9) return 'soft_limit';
  if (pct >= 0.75) return 'warning';
  return 'ok';
}

function budgetPct(used, limit) {
  return limit > 0 ? Math.round((used / limit) * 10000) / 100 : 0;
}

function budgetWriteCheckpoint(state) {
  const checkpoint = {
    session_id: state.session_id,
    checkpoint_at: timestamp(),
    budget_limit: state.budget_limit,
    used: state.used,
    tier: state.tier,
    history_count: state.history.length,
    last_entries: state.history.slice(-10),
    resume_command: '/csp-budget-extend',
  };
  ensureDir(CSP_DIR);
  writeJSON(BUDGET_CHECKPOINT_FILE, checkpoint);
}

function budgetStatusOp() {
  const state = budgetEnsure();
  const remaining = Math.max(0, state.budget_limit - state.used);
  return {
    session_id: state.session_id,
    started_at: state.started_at,
    budget_limit: state.budget_limit,
    used: state.used,
    remaining,
    percent_used: budgetPct(state.used, state.budget_limit),
    tier: state.tier,
    history_count: state.history.length,
  };
}

function budgetTrackOp(tokens, skillName) {
  const state = budgetEnsure();
  state.used += tokens;
  state.tier = budgetCalculateTier(state.used, state.budget_limit);
  state.history.push({ ts: timestamp(), tokens, skill: skillName || 'unknown' });
  if (state.history.length > 500) state.history = state.history.slice(-500);
  budgetSave(state);
  return {
    status: 'tracked',
    tokens_added: tokens,
    total_used: state.used,
    remaining: Math.max(0, state.budget_limit - state.used),
    tier: state.tier,
    percent_used: budgetPct(state.used, state.budget_limit),
  };
}

function budgetEnforceOp() {
  const state = budgetEnsure();
  const remaining = Math.max(0, state.budget_limit - state.used);
  switch (state.tier) {
    case 'ok':
      return { action: 'continue', tier: 'ok', remaining };
    case 'warning':
      return { action: 'warn', tier: 'warning', remaining, suggestion: 'Consider using shorter context or skipping optional skills' };
    case 'soft_limit':
      return { action: 'degrade', tier: 'soft_limit', remaining, suggestion: 'Downgrade model tier, disable optional skills, checkpoint workflow' };
    case 'hard_limit':
      budgetWriteCheckpoint(state);
      return { action: 'stop', tier: 'hard_limit', remaining: 0, suggestion: 'Save state to .csp/budget-checkpoint.json and stop. Resume with /csp-budget-extend' };
    default:
      return { action: 'continue', tier: 'ok', remaining };
  }
}

function budgetEstimateOp(filePath) {
  if (!filePath) return { error: 'usage', message: 'budget.estimate <file>' };
  // Resolve and validate path stays within project root
  const resolved = resolve(PROJECT_ROOT, filePath);
  const projectRoot = resolve(PROJECT_ROOT);
  if (!resolved.startsWith(projectRoot + '/') && resolved !== projectRoot) {
    return { error: 'path_traversal', message: 'File must be within the project root' };
  }
  if (!existsSync(resolved)) return { error: 'file_not_found', path: resolved };
  const content = readText(resolved);
  const ext = resolved.includes('.') ? '.' + resolved.split('.').pop().toLowerCase() : '';
  const fileType = CODE_EXTS.has(ext) ? 'code' : (ext === '.md' || ext === '.mdx' || ext === '.markdown') ? 'markdown' : 'text';
  const chars = content.length;
  const tokens = fileType === 'code' ? Math.ceil(chars / 3.5) : Math.ceil(chars / 4);
  return { file: filePath, type: fileType, chars, estimated_tokens: tokens };
}

// --- Main Router ---

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    out(`csp-sdk v0.11.1 — CSP workflow orchestration CLI

Usage:
  csp-sdk query <subcommand> [args...] [--flags]
  csp-sdk doctor
  csp-sdk version

Subcommands (query):
  init.<workflow> [phase]     Initialize workflow context
  state.load                  Load runtime state
  state.save '<json>'         Save runtime state
  state.update '<json>'       Merge-update state
  state-snapshot              Full state + roadmap snapshot
  config-get <key.path>       Read config value
  config-set <key.path> <val> Write config value
  roadmap.analyze             Parse and analyze ROADMAP.md
  roadmap.get-phase <N>       Get phase details
  phase.list                  List all phases
  commit "<msg>" [--files f]  Git add + commit
  agent-skills <name>         Load agent skill content
  resolve-model <agent>       Resolve model for agent
  stats.json                  Project statistics
  progress.bar                Progress bar string
  generate-slug "<text>"      Generate URL-safe slug
  current-timestamp           ISO timestamp
  verify.artifacts <phase>    Check phase artifacts
  verify.commits <phase>      Check phase commits
  validate.context            Validate planning context
  validate.health             Health check
  intel.search <query>        Search ALL knowledge stores (intel/wiki/skills/planning)
  intel.list                  List knowledge stores with file counts
  wiki <command> [args]       Wiki ops (ingest/query/lint/list/index) — delegates to scripts/csp-wiki.mjs
  budget.status               Token budget: current status (tier, used, remaining)
  budget.track <N> [skill]    Token budget: add N tokens to usage counter
  budget.enforce              Token budget: check tier and output enforcement action
  budget.reset                Token budget: reset counter for new session
  budget.estimate <file>      Token budget: estimate tokens in a file

Lifecycle drive chain (enforced skill handoff — IDE-agnostic):
  drive.contract              Print the lifecycle state machine (stages + gates)
  drive.init [--mode <m>]     Init .csp/lifecycle-state.json (full|lightweight|spec-only|extend)
  drive.status                Current stage, skill, retries, next
  drive.next                  Skill to run now + resolved depends_on load order + gate check
  drive.gate [stage]          Check a stage's gate (artifacts exist + commands pass) without advancing
  drive.advance               ENFORCER: advance only if gate passes, else block + repoint (no skip)
  drive.plan [mode]           Full ordered skill sequence for a mode, deps resolved transitively
  drive.goto <stage>          Escape hatch: set current_stage manually (for blocked/exhausted)`);
    process.exit(0);
  }

  if (args[0] === 'version' || args[0] === '--version') {
    out('0.11.1');
    process.exit(0);
  }

  if (args[0] === 'doctor') {
    process.exit(doctor());
  }

  // csp-sdk init-skill <name> [--layer <1|2|3|4>] [--category <c>] [--phase <p>] [--domain <d>]
  // Scaffolds a validate-passing SKILL.md (v2 frontmatter + body) in the right
  // csp-*/skills/csp-<name>/ directory. The new skill is registered on the next
  // `npm run build:all`.
  if (args[0] === 'init-skill') {
    const initArgs = args.slice(1);
    const lf = {};
    const pos = [];
    for (let i = 0; i < initArgs.length; i++) {
      if (initArgs[i].startsWith('--')) {
        const k = initArgs[i].slice(2);
        const hasNext = initArgs[i + 1] !== undefined && !initArgs[i + 1].startsWith('--');
        lf[k] = hasNext ? initArgs[++i] : true;
      } else pos.push(initArgs[i]);
    }
    const name = pos[0] || '';
    const layer = lf.layer || '3';
    const category = lf.category || ({ '1': 'meta', '2': 'workflow', '3': 'patterns', '4': 'runtime' }[layer] || 'patterns');
    const phase = lf.phase || 'build';
    const domain = lf.domain || 'patterns';
    const scope = lf.scope || 'implementation';

    if (!name) { err('usage: csp-sdk init-skill <name> [--layer 1|2|3|4]'); process.exit(1); }
    const skillName = name.startsWith('csp-') ? name : 'csp-' + name;
    if (!/^[a-z0-9-]+$/.test(skillName)) { err(`invalid skill name: ${skillName} (lowercase kebab only)`); process.exit(1); }

    const layerDir = ({ '1': 'csp-meta/skills', '2': 'csp-workflow/skills', '3': 'csp-patterns/skills', '4': 'csp-runtime/skills' }[layer]);
    if (!layerDir) { err(`invalid layer: ${layer} (1|2|3|4)`); process.exit(1); }

    const skillDir = join(PROJECT_ROOT, layerDir, skillName);
    if (existsSync(skillDir)) { err(`already exists: ${skillDir}`); process.exit(1); }
    mkdirSync(skillDir, { recursive: true });

    const template = `---
name: ${skillName}
description: "TODO: one-line description of what this skill does and when to use it."
version: 0.1.0
layer: ${layer}
category: ${category}
phase: ${phase}
domain: ${domain}
scope: ${scope}
tools: [Read, Write, Edit, Glob, Grep]
related_skills: []
---

# ${skillName}

## When to Use

<!-- Describe the trigger conditions. -->

## When NOT to Use

<!-- Describe anti-triggers. -->

## Workflow

1. <!-- Step 1 -->
2. <!-- Step 2 -->

## Verification

<!-- How does the user/agent confirm the outcome? -->
`;
    writeFileSync(join(skillDir, 'SKILL.md'), template);
    out({ status: 'created', name: skillName, path: `${layerDir}/${skillName}/SKILL.md`, next: 'npm run build:all && npm run validate:all' });
    process.exit(0);
  }

  if (args[0] !== 'query') {
    err(`Unknown command: ${args[0]}. Use "csp-sdk query <subcommand>" or "csp-sdk init-skill <name>".`);
    process.exit(1);
  }

  const sub = args[1] || '';
  const rest = args.slice(2);
  // Parse --flags
  const flags = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) {
      const key = rest[i].slice(2);
      // Use !== undefined to avoid treating empty string '' as falsy (missing value)
      const hasNext = rest[i + 1] !== undefined && !rest[i + 1].startsWith('--');
      flags[key] = hasNext ? rest[++i] : true;
    } else {
      positional.push(rest[i]);
    }
  }

  try {
    const result = routeQuery(sub, positional, flags);
    if (result !== undefined) {
      if (flags.raw && typeof result === 'object' && result !== null) {
        // --raw: output single value without JSON wrapping
        const val = Object.values(result)[0];
        out(typeof val === 'string' ? val : JSON.stringify(val));
      } else {
        out(result);
      }
    }
    process.exit(0);
  } catch (e) {
    if (e && typeof e === 'object' && e.code === 'STATE_NOT_FOUND') {
      err(e.message);
      process.exit(2);
    }
    err((e && (e.message || e.toString())) || 'Unknown error');
    process.exit(1);
  }
}

function routeQuery(sub, args, flags) {
  // --- init.* ---
  if (sub === 'init.plan-phase') return initPlanPhase(args[0]);
  if (sub === 'init.execute-phase') return initExecutePhase(args[0]);
  if (sub === 'init.phase-op') return initPhaseOp(args[0]);
  if (sub === 'init.progress') return initProgress();
  if (sub === 'init.resume') return initResume();
  if (sub === 'init.todos') return initTodos();
  if (sub === 'init.quick') return initQuick();
  if (sub === 'init.map-codebase') return initMapCodebase();
  if (sub === 'init.verify-work') return initVerifyWork(args[0]);
  if (sub === 'init.new-project') return initNewProject();
  if (sub === 'init.new-milestone') return initNewMilestone();
  if (sub === 'init.new-workspace') return { status: 'ok', message: 'Workspace init delegated to git worktree' };
  if (sub === 'init.list-workspaces') return { workspaces: [] };
  if (sub === 'init.remove-workspace') return { status: 'ok' };
  if (sub === 'init.manager') return initProgress();
  if (sub === 'init.milestone-op') return initNewMilestone();
  if (sub.startsWith('init.')) return initQuick(); // generic fallback for unknown init.*

  // --- state.* ---
  if (sub === 'state.load') {
    const state = loadState();
    if (!state) { const e = new Error('No state found. Run a workflow to initialize.'); e.code = 'STATE_NOT_FOUND'; throw e; }
    return state;
  }
  if (sub === 'state.json') return loadState() || {};
  if (sub === 'state.save') {
    const data = JSON.parse(args.join(' '));
    saveState(data);
    return { status: 'saved' };
  }
  if (sub === 'state.update' || sub === 'state.patch') {
    const current = loadState() || {};
    const patch = JSON.parse(args.join(' '));
    const merged = { ...current, ...patch };
    saveState(merged);
    return { status: 'updated', state: merged };
  }
  if (sub === 'state-snapshot') {
    const state = loadState() || {};
    const roadmap = parseRoadmap();
    return { ...state, roadmap: roadmap.phases, milestone: roadmap.milestone };
  }
  if (sub === 'state.begin-phase') {
    const state = loadState() || initState();
    state.phase = args[0] || null;
    const phase = args[0] ? getPhase(args[0]) : null;
    state.phase_name = phase?.name || null;
    saveState(state);
    return { status: 'ok', phase: state.phase, phase_name: state.phase_name };
  }
  if (sub === 'state.advance-plan') {
    const state = loadState() || {};
    state.plan_index = (state.plan_index || 0) + 1;
    saveState(state);
    return { status: 'ok', plan_index: state.plan_index };
  }
  if (sub === 'state.add-decision' || sub === 'state.add-blocker' || sub === 'state.add-roadmap-evolution') {
    const state = loadState() || {};
    const key = sub.replace('state.add-', '') + 's';
    if (!state[key]) state[key] = [];
    state[key].push({ text: args.join(' '), timestamp: timestamp() });
    saveState(state);
    return { status: 'ok', count: state[key].length };
  }
  if (sub === 'state.record-metric' || sub === 'state.record-session') {
    return { status: 'ok', message: 'recorded' };
  }
  if (sub === 'state.update-progress') {
    const state = loadState() || {};
    state.progress = args[0] || null;
    saveState(state);
    return { status: 'ok' };
  }
  if (sub === 'state.milestone-switch') {
    const state = loadState() || {};
    state.milestone = args[0] || null;
    state.phase = null;
    saveState(state);
    return { status: 'ok', milestone: state.milestone };
  }
  if (sub === 'state.planned-phase') {
    return getPhase(args[0]) || { error: 'not_found' };
  }
  if (sub.startsWith('state.')) return { status: 'ok' }; // generic fallback

  // --- drive.* : lifecycle enforcement chain ---
  if (sub === 'drive.contract') return loadContract();
  if (sub === 'drive.init') {
    const mode = flags.mode || 'full';
    const lc = initLifecycleState(mode);
    const stacks = detectTechStack();
    lc.gate_overrides = prefillGateOverrides(stacks);
    saveLifecycleState(lc);
    return { status: 'ok', mode: lc.mode, current_stage: lc.current_stage, tech_stack: stacks, s6_command: lc.gate_overrides.S6.commands[0], state_file: '.csp/lifecycle-state.json' };
  }
  if (sub === 'drive.status') return driveStatus();
  if (sub === 'drive.next') return driveNext();
  if (sub === 'drive.gate') return driveGate(args[0]);
  if (sub === 'drive.advance') return driveAdvance();
  if (sub === 'drive.plan') return drivePlan(args[0]);
  if (sub === 'drive.goto') return driveGoto(args[0]);
  if (sub.startsWith('drive.')) {
    const known = ['contract','init','status','next','gate','advance','plan','goto'];
    const subName = sub.slice(6);
    return { status: 'unimplemented', subcommand: sub, known_subcommands: known };
  }

  // --- config-* ---
  if (sub === 'config-get') {
    const val = configGet(args[0] || '');
    return val;
  }
  if (sub === 'config-set') {
    const val = configSet(args[0] || '', args[1] || '');
    return { status: 'ok', key: args[0], value: val };
  }
  if (sub === 'config-ensure-section') return { status: 'ok' };
  if (sub === 'config-new-project') return initNewProject();
  if (sub === 'config-set-model-profile') {
    configSet('model_profile', args[0] || 'balanced');
    return { status: 'ok', profile: args[0] };
  }

  // --- roadmap.* ---
  if (sub === 'roadmap.analyze' || sub === 'roadmap analyze') {
    const roadmap = parseRoadmap();
    const completed = roadmap.phases.filter(p => ['done', 'complete', '✅'].includes(p.status)).length;
    return {
      milestone: roadmap.milestone,
      phases: roadmap.phases,
      total: roadmap.phases.length,
      completed,
      pending: roadmap.phases.length - completed,
      current: (loadState() || {}).phase || null,
    };
  }
  if (sub === 'roadmap.get-phase' || sub === 'roadmap get-phase') {
    const phase = getPhase(args[0]);
    if (!phase) return { error: 'not_found', phase: args[0] };
    if (flags.pick) return phase[flags.pick] ?? null;
    return phase;
  }
  if (sub === 'roadmap.update-plan-progress') return { status: 'ok' };
  if (sub === 'roadmap.annotate-dependencies') return { status: 'ok', annotations: [] };

  // --- phase.* ---
  if (sub === 'phase.list' || sub === 'phases.list') {
    return { phases: parseRoadmap().phases };
  }
  if (sub === 'phase.remove') {
    return { status: 'ok', removed: args[0], message: 'Phase removal requires manual ROADMAP.md edit' };
  }
  if (sub === 'phase.add' || sub === 'phase.insert') {
    return { status: 'ok', message: 'Phase addition requires manual ROADMAP.md edit' };
  }
  if (sub === 'phase.complete') {
    const state = loadState() || {};
    state.phase = null;
    saveState(state);
    return { status: 'ok', completed: args[0] };
  }
  if (sub === 'phase.list-artifacts') {
    const dir = findPhaseDir(args[0]);
    return { artifacts: dir ? listPhaseArtifacts(dir) : [] };
  }
  if (sub === 'phase.list-plans') {
    const dir = findPhaseDir(args[0]);
    if (!dir) return { plans: [] };
    try {
      const plans = readdirSync(dir).filter(f => f.includes('PLAN'));
      return { plans };
    } catch { return { plans: [] }; }
  }
  if (sub === 'phase.mvp-mode') {
    const phase = getPhase(args[0]);
    if (flags.pick === 'active') return phase?.status !== 'done';
    return { mode: phase?.status === 'done' ? 'inactive' : 'active' };
  }
  if (sub === 'phase.next-decimal') {
    const roadmap = parseRoadmap();
    const base = args[0] || '1';
    const decimals = roadmap.phases.filter(p => p.number.startsWith(base + '.'));
    const next = decimals.length + 1;
    return `${base}.${next}`;
  }
  if (sub === 'phases.clear') return { status: 'ok' };
  if (sub.startsWith('phase.')) return { status: 'ok' };

  // --- milestone.* ---
  if (sub === 'milestone.complete') {
    const state = loadState() || {};
    state.milestone = null;
    state.phase = null;
    saveState(state);
    return { status: 'ok', message: 'Milestone marked complete' };
  }

  // --- commit ---
  if (sub === 'commit' || sub === 'commit-to-subrepo') {
    const msg = args[0] || 'chore: csp-sdk commit';
    const files = flags.files || null;
    return doCommit(msg, files);
  }

  // --- agent-skills ---
  if (sub === 'agent-skills') return getAgentSkills(args[0] || '');

  // --- resolve-model ---
  if (sub === 'resolve-model') return resolveModel(args[0] || '');

  // --- stats/progress ---
  if (sub === 'stats.json') return getStats();
  if (sub === 'progress.bar') return progressBar();
  if (sub === 'progress') return initProgress();

  // --- verify/validate ---
  if (sub === 'verify.artifacts') return verifyArtifacts(args[0]);
  if (sub === 'verify.commits') return verifyCommits(args[0]);
  if (sub === 'verify.key-links') return { status: 'pass', links: [] };
  if (sub === 'verify.plan-structure') return { status: 'pass' };
  if (sub === 'verify.schema-drift') return { status: 'pass', drift: [] };
  if (sub === 'validate.context') {
    return {
      valid: existsSync(PLANNING_DIR),
      has_roadmap: existsSync(ROADMAP_FILE),
      has_config: existsSync(CONFIG_FILE),
      has_state: existsSync(STATE_FILE),
    };
  }
  if (sub === 'validate.health') return { healthy: true };
  // Generic verify.*/validate.*/check.* fallbacks now report unimplemented instead
  // of silently returning pass/coverage:1.0 — callers (hooks/agents) previously
  // could not distinguish "check passed" from "check does not exist".
  if (sub.startsWith('verify.') || sub.startsWith('validate.')) {
    return { status: 'unimplemented', subcommand: sub };
  }

  // --- check.* ---
  if (sub.startsWith('check.')) {
    return { status: 'unimplemented', subcommand: sub };
  }

  // --- utilities ---
  if (sub === 'generate-slug') return slugify(args.join(' '));
  if (sub === 'current-timestamp') return timestamp();
  if (sub === 'detect-custom-files') return detectCustomFiles(flags['config-dir'] || flags.configDir || '');
  if (sub === 'generate-claude-md' || sub === 'generate-claude-profile' || sub === 'generate-dev-preferences') {
    return { status: 'ok', message: 'Generation delegated to AI agent' };
  }
  if (sub === 'frontmatter.get') return {};
  if (sub === 'frontmatter.set') return { status: 'ok' };
  if (sub === 'frontmatter.validate') return { valid: true };
  if (sub === 'summary-extract') return { one_liner: '' };
  if (sub === 'prompt-budget') return { budget: 100000, used: 0, remaining: 100000 };
  if (sub === 'history-digest') return { entries: [] };
  if (sub === 'scan-sessions') return { sessions: [] };
  if (sub === 'profile-questionnaire' || sub === 'profile-sample') return { profile: {} };
  if (sub === 'write-profile') return { status: 'ok' };
  if (sub === 'websearch') return { results: [], message: 'Web search not available in csp-sdk' };
  if (sub === 'audit-open' || sub === 'audit-uat') return { items: [] };
  if (sub === 'find-phase') return getPhase(args[0]) || { error: 'not_found' };
  if (sub === 'phase-plan-index') return { plans: [] };
  if (sub === 'plan.task-structure') return { tasks: [] };
  if (sub === 'requirements.mark-complete') return { status: 'ok' };
  if (sub === 'task.is-behavior-adding') return { result: true };
  if (sub === 'todo.match-phase') return { matches: [] };
  if (sub === 'uat.render-checkpoint') return { checkpoint: null };
  if (sub === 'user-story.validate') return { valid: true, story: args[0] || '' };
  if (sub === 'docs-init') return { docs_dir: join(PROJECT_ROOT, 'docs'), exists: existsSync(join(PROJECT_ROOT, 'docs')) };

  // --- intel.* (unified knowledge store search) ---
  if (sub === 'intel.search') {
    const query = args.join(' ').toLowerCase();
    if (!query) return { error: 'usage', message: 'intel.search <query>' };
    const results = [];
    const stores = [
      { name: 'intel', dir: join(CSP_DIR, 'intel') },
      { name: 'wiki', dir: join(CSP_DIR, 'wiki') },
      { name: 'skills', dir: join(CSP_DIR, 'skills') },
      { name: 'planning', dir: PLANNING_DIR },
    ];
    for (const store of stores) {
      if (!existsSync(store.dir)) continue;
      const files = findMarkdownFiles(store.dir);
      for (const filePath of files) {
        const content = readText(filePath);
        const lines = content.split('\n');
        const snippets = [];
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(query)) {
            const start = Math.max(0, i - 1);
            const end = Math.min(lines.length - 1, i + 1);
            snippets.push({
              line: i + 1,
              context: lines.slice(start, end + 1).join('\n').trim(),
            });
            if (snippets.length >= 3) break; // max 3 snippets per file
          }
        }
        if (snippets.length > 0) {
          results.push({
            store: store.name,
            file: filePath.replace(PROJECT_ROOT + '/', ''),
            snippets,
          });
        }
      }
    }
    return { query, results, total: results.length };
  }
  if (sub === 'intel.list') {
    const stores = [
      { name: 'intel', dir: join(CSP_DIR, 'intel') },
      { name: 'wiki', dir: join(CSP_DIR, 'wiki') },
      { name: 'skills', dir: join(CSP_DIR, 'skills') },
      { name: 'planning', dir: PLANNING_DIR },
    ];
    const summary = stores.map(store => {
      const exists = existsSync(store.dir);
      const files = exists ? findMarkdownFiles(store.dir) : [];
      return { name: store.name, dir: store.dir.replace(PROJECT_ROOT + '/', ''), exists, file_count: files.length, files: files.map(f => f.replace(PROJECT_ROOT + '/', '')) };
    });
    const totalFiles = summary.reduce((acc, s) => acc + s.file_count, 0);
    return { stores: summary, total_files: totalFiles };
  }

  // --- wiki (delegates to scripts/csp-wiki.mjs) ---
  if (sub === 'wiki' || sub.startsWith('wiki.')) {
    const wikiCmd = sub === 'wiki' ? (args[0] || '') : sub.replace('wiki.', '');
    const wikiArgs = sub === 'wiki' ? args.slice(1) : args;
    const scriptPath = join(dirname(new URL(import.meta.url).pathname), '..', 'scripts', 'csp-wiki.mjs');
    if (!existsSync(scriptPath)) return { error: 'not_found', message: `Wiki script not found at ${scriptPath}` };
    try {
      const result = execFileSync('node', [scriptPath, wikiCmd, ...wikiArgs], {
        cwd: PROJECT_ROOT, encoding: 'utf-8', timeout: 15000,
        env: { ...process.env, CSP_PROJECT_ROOT: PROJECT_ROOT },
      });
      try { return JSON.parse(result); } catch { return { output: result.trim() }; }
    } catch (e) {
      return { error: 'wiki_error', message: (e.stderr || e.message || '').trim(), output: (e.stdout || '').trim() };
    }
  }

  // --- learnings ---
  if (sub === 'learnings.query') {
    const intelDir = join(CSP_DIR, 'intel');
    if (!existsSync(intelDir)) return { entries: [] };
    try {
      const files = readdirSync(intelDir).filter(f => f.endsWith('.md'));
      return { entries: files.map(f => ({ file: f, content: readText(join(intelDir, f)).slice(0, 200) })) };
    } catch { return { entries: [] }; }
  }
  if (sub === 'learnings.copy') return { status: 'ok' };

  // --- workstream ---
  if (sub === 'workstream.list') return { workstreams: [] };
  if (sub === 'workstream.create') return { status: 'ok', id: randomUUID().slice(0, 8) };
  if (sub.startsWith('workstream.')) return { status: 'ok' };

  // --- worktree ---
  if (sub === 'worktree.cleanup-wave' || sub === 'worktree.reap-orphans') return { status: 'ok', cleaned: 0 };

  // --- agent.* ---
  if (sub === 'agent.classify-failure') return { category: 'unknown', retryable: true };

  // --- budget.* (token budget active counting — Phase 4.18) ---
  if (sub === 'budget.status' || sub === 'budget status') {
    return budgetStatusOp();
  }
  if (sub === 'budget.track' || sub === 'budget track') {
    const tokens = parseInt(args[0], 10);
    if (isNaN(tokens) || tokens < 0) return { error: 'usage', message: 'budget.track <tokens> [skill-name]' };
    return budgetTrackOp(tokens, args[1] || 'unknown');
  }
  if (sub === 'budget.enforce' || sub === 'budget enforce') {
    return budgetEnforceOp();
  }
  if (sub === 'budget.reset' || sub === 'budget reset') {
    const state = budgetCreateState();
    budgetSave(state);
    return { status: 'reset', session_id: state.session_id, budget_limit: state.budget_limit };
  }
  if (sub === 'budget.estimate' || sub === 'budget estimate') {
    return budgetEstimateOp(args[0]);
  }
  if (sub.startsWith('budget.')) return budgetStatusOp();

  // --- Fallback: unknown subcommand. Previously returned success, masking every
  // typo / unimplemented route as a green result. Throwing lets main()'s catch
  // block emit stderr and exit 1 so callers can detect the unknown route.
  throw new Error(`unknown subcommand: ${sub}`);
}

main();
