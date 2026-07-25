#!/usr/bin/env node
/**
 * token-budget.mjs — Active token budget tracking and enforcement
 *
 * Usage:
 *   node scripts/token-budget.mjs status          — Show current budget status
 *   node scripts/token-budget.mjs track <tokens>  — Add token usage
 *   node scripts/token-budget.mjs reset           — Reset counter for new session
 *   node scripts/token-budget.mjs estimate <file> — Estimate tokens in a file
 *   node scripts/token-budget.mjs enforce         — Check tier and output action
 *
 * State: .csp/budget.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// --- Constants ---

const PROJECT_ROOT = process.env.CSP_PROJECT_ROOT || process.cwd();
const CSP_DIR = join(PROJECT_ROOT, '.csp');
const BUDGET_FILE = join(CSP_DIR, 'budget.json');
const CHECKPOINT_FILE = join(CSP_DIR, 'budget-checkpoint.json');
const CONFIG_FILE = join(PROJECT_ROOT, '.planning', 'config.json');
const DEFAULT_BUDGET_LIMIT = 200000;

// --- File type classification ---

const CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.rb', '.go',
  '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.hpp', '.cs',
  '.php', '.sh', '.bash', '.zsh', '.pl', '.lua', '.r', '.scala',
  '.hs', '.ex', '.exs', '.clj', '.cljs', '.vue', '.svelte', '.sql',
]);

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx', '.markdown']);

// --- Utilities ---

function readJSON(path, fallback = null) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return fallback; }
}

function writeJSON(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function timestamp() {
  return new Date().toISOString();
}

function out(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

function err(msg) {
  process.stderr.write(`token-budget: ${msg}\n`);
}

// --- Config ---

function getBudgetLimit() {
  const config = readJSON(CONFIG_FILE, {});
  // Navigate budget.limit key path
  const limit = config?.budget?.limit;
  if (typeof limit === 'number' && limit > 0) return limit;
  return DEFAULT_BUDGET_LIMIT;
}

// --- Token Estimation ---

function classifyFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (MARKDOWN_EXTENSIONS.has(ext)) return 'markdown';
  return 'text';
}

function estimateTokens(chars, fileType) {
  switch (fileType) {
    case 'code':
      return Math.ceil(chars / 3.5);
    case 'markdown':
      return Math.ceil(chars / 4);
    case 'text':
    default:
      return Math.ceil(chars / 4);
  }
}

function estimateFile(filePath) {
  const resolved = resolve(PROJECT_ROOT, filePath);
  if (!existsSync(resolved)) {
    return { error: 'file_not_found', path: resolved };
  }
  const stat = statSync(resolved);
  const content = readFileSync(resolved, 'utf-8');
  const fileType = classifyFile(resolved);
  const chars = content.length;
  const tokens = estimateTokens(chars, fileType);
  return {
    file: filePath,
    type: fileType,
    chars,
    estimated_tokens: tokens,
    size_bytes: stat.size,
  };
}

// --- Budget State ---

function loadBudget() {
  return readJSON(BUDGET_FILE, null);
}

function saveBudget(state) {
  writeJSON(BUDGET_FILE, state);
}

function createBudgetState() {
  return {
    session_id: randomUUID(),
    started_at: timestamp(),
    budget_limit: getBudgetLimit(),
    used: 0,
    history: [],
    tier: 'ok',
  };
}

function ensureBudget() {
  let state = loadBudget();
  if (!state) {
    state = createBudgetState();
    saveBudget(state);
  }
  // Refresh budget_limit from config in case it changed
  state.budget_limit = getBudgetLimit();
  return state;
}

// --- Tier Calculation ---

function calculateTier(used, budgetLimit) {
  const pct = budgetLimit > 0 ? used / budgetLimit : 0;
  if (pct >= 1.0) return 'hard_limit';
  if (pct >= 0.9) return 'soft_limit';
  if (pct >= 0.75) return 'warning';
  return 'ok';
}

function tierPercent(used, budgetLimit) {
  return budgetLimit > 0 ? Math.round((used / budgetLimit) * 10000) / 100 : 0;
}

// --- Commands ---

function cmdStatus() {
  const state = ensureBudget();
  const pct = tierPercent(state.used, state.budget_limit);
  const remaining = Math.max(0, state.budget_limit - state.used);
  out({
    session_id: state.session_id,
    started_at: state.started_at,
    budget_limit: state.budget_limit,
    used: state.used,
    remaining,
    percent_used: pct,
    tier: state.tier,
    history_count: state.history.length,
    last_entry: state.history.length > 0 ? state.history[state.history.length - 1] : null,
  });
}

function cmdTrack(tokensArg, skillName) {
  const tokens = parseInt(tokensArg, 10);
  if (isNaN(tokens) || tokens < 0) {
    err('Usage: track <tokens> [skill-name]. Tokens must be a non-negative integer.');
    process.exit(1);
  }

  const state = ensureBudget();
  state.used += tokens;
  state.tier = calculateTier(state.used, state.budget_limit);
  state.history.push({
    ts: timestamp(),
    tokens,
    skill: skillName || 'unknown',
  });

  // Keep history bounded (last 500 entries)
  if (state.history.length > 500) {
    state.history = state.history.slice(-500);
  }

  saveBudget(state);

  const remaining = Math.max(0, state.budget_limit - state.used);
  out({
    status: 'tracked',
    tokens_added: tokens,
    total_used: state.used,
    remaining,
    tier: state.tier,
    percent_used: tierPercent(state.used, state.budget_limit),
  });
}

function cmdReset() {
  const state = createBudgetState();
  saveBudget(state);
  out({
    status: 'reset',
    session_id: state.session_id,
    budget_limit: state.budget_limit,
    message: 'Budget counter reset for new session.',
  });
}

function cmdEstimate(filePath) {
  if (!filePath) {
    err('Usage: estimate <file>');
    process.exit(1);
  }
  const result = estimateFile(filePath);
  if (result.error) {
    err(`File not found: ${result.path}`);
    process.exit(1);
  }
  out(result);
}

function cmdEnforce() {
  const state = ensureBudget();
  const remaining = Math.max(0, state.budget_limit - state.used);
  const tier = state.tier;

  let action;
  switch (tier) {
    case 'ok':
      action = { action: 'continue', tier: 'ok', remaining };
      break;
    case 'warning':
      action = {
        action: 'warn',
        tier: 'warning',
        remaining,
        suggestion: 'Consider using shorter context or skipping optional skills',
      };
      break;
    case 'soft_limit':
      action = {
        action: 'degrade',
        tier: 'soft_limit',
        remaining,
        suggestion: 'Downgrade model tier, disable optional skills, checkpoint workflow',
      };
      break;
    case 'hard_limit':
      action = {
        action: 'stop',
        tier: 'hard_limit',
        remaining: 0,
        suggestion: 'Save state to .csp/budget-checkpoint.json and stop. Resume with /csp-budget-extend',
      };
      // Write checkpoint on HARD_LIMIT
      writeCheckpoint(state);
      break;
    default:
      action = { action: 'continue', tier: 'ok', remaining };
  }

  out(action);
}

// --- Checkpoint ---

function writeCheckpoint(state) {
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
  writeJSON(CHECKPOINT_FILE, checkpoint);
}

// --- Exported logic for csp-sdk integration ---

export function budgetStatus() {
  const state = ensureBudget();
  const remaining = Math.max(0, state.budget_limit - state.used);
  return {
    session_id: state.session_id,
    started_at: state.started_at,
    budget_limit: state.budget_limit,
    used: state.used,
    remaining,
    percent_used: tierPercent(state.used, state.budget_limit),
    tier: state.tier,
    history_count: state.history.length,
  };
}

export function budgetTrack(tokens, skillName) {
  const state = ensureBudget();
  state.used += tokens;
  state.tier = calculateTier(state.used, state.budget_limit);
  state.history.push({ ts: timestamp(), tokens, skill: skillName || 'unknown' });
  if (state.history.length > 500) {
    state.history = state.history.slice(-500);
  }
  saveBudget(state);
  return {
    status: 'tracked',
    tokens_added: tokens,
    total_used: state.used,
    remaining: Math.max(0, state.budget_limit - state.used),
    tier: state.tier,
    percent_used: tierPercent(state.used, state.budget_limit),
  };
}

export function budgetEnforce() {
  const state = ensureBudget();
  const remaining = Math.max(0, state.budget_limit - state.used);
  const tier = state.tier;

  switch (tier) {
    case 'ok':
      return { action: 'continue', tier: 'ok', remaining };
    case 'warning':
      return { action: 'warn', tier: 'warning', remaining, suggestion: 'Consider using shorter context or skipping optional skills' };
    case 'soft_limit':
      return { action: 'degrade', tier: 'soft_limit', remaining, suggestion: 'Downgrade model tier, disable optional skills, checkpoint workflow' };
    case 'hard_limit':
      writeCheckpoint(state);
      return { action: 'stop', tier: 'hard_limit', remaining: 0, suggestion: 'Save state to .csp/budget-checkpoint.json and stop. Resume with /csp-budget-extend' };
    default:
      return { action: 'continue', tier: 'ok', remaining };
  }
}

// --- Main (CLI entry point) ---

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      cmdStatus();
      break;
    case 'track':
      cmdTrack(args[1], args[2]);
      break;
    case 'reset':
      cmdReset();
      break;
    case 'estimate':
      cmdEstimate(args[1]);
      break;
    case 'enforce':
      cmdEnforce();
      break;
    default:
      err(`Unknown command: ${command || '(none)'}`);
      err('Usage: token-budget.mjs <status|track|reset|estimate|enforce> [args]');
      process.exit(1);
  }
}
