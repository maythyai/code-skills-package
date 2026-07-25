#!/usr/bin/env node
/**
 * validate-triggers.mjs
 *
 * Validates that csp-router/triggers.yaml only references skills that exist in
 * csp-router/registry.json.
 *
 * Zero external dependencies — the YAML file is parsed pragmatically with a
 * line-by-line, regex-based approach (we do NOT need a full YAML parser):
 *
 *   - Skill references are read from the value lists of the keys that hold
 *     skill names:  skills, reviewers, testers, build_resolvers, boost.
 *   - The `patterns:` key holds skill names ONLY inside the `stack_rules`
 *     section. Inside `intent_patterns` the same key holds regex strings, so it
 *     is deliberately ignored there to avoid false positives.
 *   - Trigger words in this file are always written as quoted mapping keys
 *     (e.g.  "review":  ), which lets us detect duplicate trigger keys reliably.
 *
 * Output:
 *   - broken references (skill in triggers.yaml but NOT in registry.json)
 *   - duplicate trigger keys (same trigger word defined more than once)
 *   - summary counts
 *
 * Exit code: 0 when there are no broken references, 1 otherwise.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REGISTRY_PATH = resolve(ROOT, 'csp-router', 'registry.json');
const TRIGGERS_PATH = resolve(ROOT, 'csp-router', 'triggers.yaml');

// Keys whose bracketed list values are always skill names.
const SKILL_LIST_KEYS = new Set([
  'skills',
  'reviewers',
  'testers',
  'build_resolvers',
  'boost',
]);

// A skill name: starts with a letter/digit, then letters/digits/_/-.
const SKILL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

// ── Load registry ────────────────────────────────────────────────────────────
function loadRegistryNames(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    fail(`cannot read registry.json at ${path}: ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    fail(`registry.json is not valid JSON: ${err.message}`);
  }

  // Accept either a bare array of skill objects or an object with a `skills`
  // array (the real registry.json uses the latter shape).
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.skills)
      ? data.skills
      : null;

  if (!list) {
    fail('registry.json has no recognizable skills array');
  }

  const names = new Set();
  for (const entry of list) {
    if (entry && typeof entry.name === 'string' && entry.name.length > 0) {
      names.add(entry.name);
    }
  }
  return names;
}

// ── Parse triggers.yaml pragmatically ────────────────────────────────────────
function parseTriggers(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    fail(`cannot read triggers.yaml at ${path}: ${err.message}`);
  }

  const lines = raw.split(/\r?\n/);

  // skillRefs: { name, line, key, section }
  const skillRefs = [];
  // triggerKeys: Map<key, number[]> (line numbers where the trigger word appears)
  const triggerKeys = new Map();

  // Top-level section header: starts at column 0, e.g. "trigger_index:".
  const sectionRe = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(#.*)?$/;
  // A list-valued key, e.g. "    skills: [a, b]" or 'reviewers: ["x"]'.
  const listKeyRe = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[(.*)\]\s*(#.*)?$/;
  // A quoted trigger key, e.g. '  "review":' (trigger words are always quoted).
  const triggerKeyRe = /^\s*"((?:[^"\\]|\\.)*)"\s*:\s*(#.*)?$/;

  let section = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // Skip blank lines and full-line comments.
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // Detect a top-level section change.
    const secMatch = line.match(sectionRe);
    if (secMatch) {
      section = secMatch[1];
      continue;
    }

    // Record quoted trigger keys for duplicate detection.
    const tkMatch = line.match(triggerKeyRe);
    if (tkMatch) {
      const key = tkMatch[1];
      if (!triggerKeys.has(key)) triggerKeys.set(key, []);
      triggerKeys.get(key).push(lineNo);
      // A trigger-key line never also carries a skill list, so continue.
      continue;
    }

    // Extract skill references from list-valued keys.
    const lkMatch = line.match(listKeyRe);
    if (lkMatch) {
      const key = lkMatch[1];
      const inner = lkMatch[2];

      // `patterns:` is only a skill list inside stack_rules; elsewhere it holds
      // regex/keyword strings and must be ignored.
      const isSkillKey =
        SKILL_LIST_KEYS.has(key) || (key === 'patterns' && section === 'stack_rules');

      if (isSkillKey) {
        for (const item of inner.split(',')) {
          const name = item.trim().replace(/^["']|["']$/g, '').trim();
          if (name === '') continue;
          if (!SKILL_NAME_RE.test(name)) continue; // skip regex-ish tokens
          skillRefs.push({ name, line: lineNo, key, section });
        }
      }
    }
  }

  return { skillRefs, triggerKeys };
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const registryNames = loadRegistryNames(REGISTRY_PATH);
  const { skillRefs, triggerKeys } = parseTriggers(TRIGGERS_PATH);

  // Unique referenced skill names.
  const uniqueRefs = new Set(skillRefs.map((r) => r.name));

  // Broken references: referenced but absent from the registry.
  const brokenByName = new Map(); // name -> [{line, key, section}]
  for (const ref of skillRefs) {
    if (!registryNames.has(ref.name)) {
      if (!brokenByName.has(ref.name)) brokenByName.set(ref.name, []);
      brokenByName.get(ref.name).push(ref);
    }
  }
  const brokenNames = [...brokenByName.keys()].sort();

  // Duplicate trigger keys.
  const duplicates = [...triggerKeys.entries()]
    .filter(([, lines]) => lines.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  // ── Report ───────────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════════════════════════');
  console.log(' triggers.yaml → registry.json validation');
  console.log('════════════════════════════════════════════════════════════');
  console.log(` registry:            ${REGISTRY_PATH}`);
  console.log(` triggers:            ${TRIGGERS_PATH}`);
  console.log(` registry skills:     ${registryNames.size}`);
  console.log(` skill references:    ${skillRefs.length} (${uniqueRefs.size} unique)`);
  console.log('');

  // Broken references
  console.log(`── Broken references (${brokenNames.length}) ──`);
  if (brokenNames.length === 0) {
    console.log('  none — every referenced skill exists in the registry.');
  } else {
    for (const name of brokenNames) {
      const locs = brokenByName.get(name);
      const lines = locs.map((l) => `L${l.line}`).join(', ');
      const sections = [...new Set(locs.map((l) => l.section))].join(', ');
      console.log(`  ✗ ${name}`);
      console.log(`      referenced ${locs.length}× at ${lines} [${sections}]`);
    }
  }
  console.log('');

  // Duplicate trigger keys
  console.log(`── Duplicate trigger keys (${duplicates.length}) ──`);
  if (duplicates.length === 0) {
    console.log('  none — no trigger word is defined more than once.');
  } else {
    for (const [key, lines] of duplicates) {
      console.log(`  ⚠ "${key}" defined ${lines.length}× at ${lines.map((l) => `L${l}`).join(', ')}`);
    }
  }
  console.log('');

  // Summary
  console.log('── Summary ──');
  console.log(`  unique skills referenced:  ${uniqueRefs.size}`);
  console.log(`  broken references:         ${brokenNames.length}`);
  console.log(`  duplicate trigger keys:    ${duplicates.length}`);
  console.log('════════════════════════════════════════════════════════════');

  if (brokenNames.length > 0) {
    console.log(`\nRESULT: FAIL — ${brokenNames.length} broken skill reference(s).`);
    process.exit(1);
  }
  console.log('\nRESULT: PASS — no broken skill references.');
  process.exit(0);
}

main();
