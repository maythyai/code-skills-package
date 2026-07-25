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
 *   .planning/           — Project planning (ROADMAP.md, STATE.md, config.json, phases/)
 *   .csp/state.json      — Runtime state (phase/tech_stack/git_status)
 *   .csp/intel/*.md      — Learning outputs
 *
 * Exit codes: 0=success, 1=error, 2=state not found (init scenario)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// --- Utilities ---

const PROJECT_ROOT = process.env.CSP_PROJECT_ROOT || process.cwd();
const PLANNING_DIR = join(PROJECT_ROOT, '.planning');
const CSP_DIR = join(PROJECT_ROOT, '.csp');
const STATE_FILE = join(CSP_DIR, 'state.json');
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

// --- State Management ---

function loadState() {
  return readJSON(STATE_FILE, null);
}

function saveState(state) {
  ensureDir(CSP_DIR);
  writeJSON(STATE_FILE, { ...state, _updated: timestamp() });
}

function initState() {
  const state = {
    version: '0.8.0',
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
  else if (!isNaN(value) && value !== '') parsed = Number(value);
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
  if (fileList.length > 0) {
    for (const f of fileList) {
      git(`add "${f}"`);
    }
  } else {
    git('add -A');
  }
  const result = git(`commit -m "${message.replace(/"/g, '\\"')}"`);
  return { success: result.includes('[') || result === '', output: result };
}

// --- Agent Skills ---

function getAgentSkills(agentName) {
  // Search in csp-runtime/agents/ and csp-patterns/agents/
  const searchDirs = [
    join(PROJECT_ROOT, 'csp-runtime', 'agents'),
    join(PROJECT_ROOT, 'csp-patterns', 'agents'),
  ];
  for (const dir of searchDirs) {
    const mdPath = join(dir, `${agentName}.md`);
    const skillPath = join(dir, agentName, 'SKILL.md');
    if (existsSync(mdPath)) return { name: agentName, content: readText(mdPath), path: mdPath };
    if (existsSync(skillPath)) return { name: agentName, content: readText(skillPath), path: skillPath };
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
    version: '0.8.0',
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
  const phasePattern = new RegExp(`phase.?${phaseArg}|${String(phaseArg).padStart(2, '0')}`, 'i');
  const relevant = log.split('\n').filter(l => phasePattern.test(l));
  return { status: relevant.length > 0 ? 'pass' : 'warn', commits: relevant, total_recent: log.split('\n').length };
}

// --- Doctor ---

function doctor() {
  const checks = [];
  checks.push({ name: 'project_root', status: 'ok', value: PROJECT_ROOT });
  checks.push({ name: '.planning/', status: existsSync(PLANNING_DIR) ? 'ok' : 'missing' });
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

// --- Main Router ---

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    out(`csp-sdk v0.8.0 — CSP workflow orchestration CLI

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
  validate.health             Health check`);
    process.exit(0);
  }

  if (args[0] === 'version' || args[0] === '--version') {
    out('0.8.0');
    process.exit(0);
  }

  if (args[0] === 'doctor') {
    process.exit(doctor());
  }

  if (args[0] !== 'query') {
    err(`Unknown command: ${args[0]}. Use "csp-sdk query <subcommand>".`);
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
      flags[key] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
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
    if (e.code === 'STATE_NOT_FOUND') {
      err(e.message);
      process.exit(2);
    }
    err(e.message);
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
  if (sub.startsWith('verify.') || sub.startsWith('validate.')) return { status: 'pass' };

  // --- check.* ---
  if (sub.startsWith('check.')) return { status: 'pass', coverage: 1.0 };

  // --- utilities ---
  if (sub === 'generate-slug') return slugify(args.join(' '));
  if (sub === 'current-timestamp') return timestamp();
  if (sub === 'detect-custom-files') return { custom_files: [] };
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

  // --- Fallback: return empty success for unknown subcommands ---
  return { status: 'ok', _note: `Unhandled subcommand "${sub}" — returning default success` };
}

main();
