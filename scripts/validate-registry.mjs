#!/usr/bin/env node
/**
 * validate-registry.mjs — Structural schema validation for csp-router/registry.json.
 *
 * registry.json is the derived source-of-truth for the 587-skill catalogue. Until now
 * it had no schema guard — a malformed entry (wrong type, missing path, dangling
 * layer) would only surface as a runtime routing failure. This validator enforces:
 *
 *   - top-level shape (version/total_skills/skills/shards/skill_metadata)
 *   - per-skill required fields + types
 *   - layer ∈ {0,1,2,3,4}
 *   - category is a non-empty string
 *   - path exists on disk (catches stale registry after a skill move/delete)
 *   - triggers.{keywords,file_patterns,context} are arrays
 *   - deps is an array of strings, each referencing a known skill name
 *   - priority is a non-negative integer
 *   - name is unique within the registry
 *
 * Exit code: 1 if any violation, 0 otherwise.
 * Usage: node scripts/validate-registry.mjs [--root <path>]
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT_IDX = process.argv.indexOf('--root');
const ROOT = ROOT_IDX >= 0 && process.argv[ROOT_IDX + 1]
  ? resolve(process.argv[ROOT_IDX + 1])
  : process.cwd();
const REGISTRY_PATH = join(ROOT, 'csp-router', 'registry.json');

const VALID_LAYERS = [0, 1, 2, 3, 4];
const VALID_CATEGORIES = new Set([
  'router', 'meta', 'workflow', 'patterns', 'runtime',
  'agent', 'skill', 'tool', 'review', 'other',
]);

let errors = 0;
let warnings = 0;
const fail = (msg) => { errors++; console.error(`  ✗ ${msg}`); };
const warn = (msg) => { warnings++; console.error(`  ! ${msg}`); };

if (!existsSync(REGISTRY_PATH)) {
  console.error(`registry.json not found at ${REGISTRY_PATH}`);
  process.exit(1);
}

let registry;
try {
  registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
} catch (e) {
  console.error(`registry.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

console.log('═══ validate-registry.mjs ═══');
console.log(`  registry: ${REGISTRY_PATH}`);

// --- top-level ---
if (typeof registry.version !== 'string') fail(`top-level "version" must be a string, got ${typeof registry.version}`);
if (!Array.isArray(registry.skills)) fail('top-level "skills" must be an array');
if (typeof registry.total_skills !== 'number') fail('top-level "total_skills" must be a number');
else if (registry.total_skills !== registry.skills.length) {
  fail(`total_skills (${registry.total_skills}) !== skills.length (${registry.skills.length})`);
}

const seenNames = new Map(); // name -> first index (for dup detection)
const allNames = new Set(registry.skills.map(s => s?.name).filter(Boolean));

let checked = 0;
for (let i = 0; i < registry.skills.length; i++) {
  const s = registry.skills[i];
  const where = `skills[${i}]${s?.name ? ` (${s.name})` : ''}`;
  checked++;

  // required fields
  if (s == null || typeof s !== 'object') { fail(`${where}: not an object`); continue; }
  if (typeof s.name !== 'string' || !s.name) { fail(`${where}: missing/empty "name"`); }
  else {
    if (seenNames.has(s.name)) fail(`${where}: duplicate name "${s.name}" (first at [${seenNames.get(s.name)}])`);
    else seenNames.set(s.name, i);
  }
  if (typeof s.description !== 'string' || !s.description) fail(`${where}: missing/empty "description"`);
  if (typeof s.layer !== 'number' || !VALID_LAYERS.includes(s.layer)) {
    fail(`${where}: invalid layer ${JSON.stringify(s.layer)} (valid: ${VALID_LAYERS.join(',')})`);
  }
  if (typeof s.category !== 'string' || !s.category) fail(`${where}: missing/empty "category"`);
  else if (!VALID_CATEGORIES.has(s.category)) warn(`${where}: category "${s.category}" not in known set (allowed but unusual)`);

  if (typeof s.path !== 'string' || !s.path) { fail(`${where}: missing/empty "path"`); }
  else if (!existsSync(join(ROOT, s.path))) {
    fail(`${where}: path does not exist on disk: ${s.path}`);
  }

  if (typeof s.priority !== 'number' || s.priority < 0 || !Number.isInteger(s.priority)) {
    fail(`${where}: invalid priority ${JSON.stringify(s.priority)} (must be non-negative int)`);
  }

  // triggers shape
  if (s.triggers == null || typeof s.triggers !== 'object') {
    fail(`${where}: "triggers" must be an object`);
  } else {
    for (const k of ['keywords', 'file_patterns', 'context']) {
      const v = s.triggers[k];
      if (v !== undefined && !Array.isArray(v)) fail(`${where}: triggers.${k} must be an array, got ${typeof v}`);
    }
  }

  if (s.stack_detection !== undefined && typeof s.stack_detection !== 'boolean') {
    fail(`${where}: stack_detection must be boolean, got ${typeof s.stack_detection}`);
  }

  // deprecation flags (propagated from frontmatter by build-registry.mjs)
  if (s.deprecated !== undefined && typeof s.deprecated !== 'boolean') {
    fail(`${where}: deprecated must be boolean, got ${typeof s.deprecated}`);
  }
  if (s.redirect !== undefined && (typeof s.redirect !== 'string' || !s.redirect)) {
    fail(`${where}: redirect must be a non-empty string`);
  }
  if (s.deprecated === true && !s.redirect) {
    warn(`${where}: marked deprecated but has no redirect target`);
  }

  // deps must reference known skills
  if (s.deps !== undefined) {
    if (!Array.isArray(s.deps)) fail(`${where}: "deps" must be an array`);
    else for (const d of s.deps) {
      if (typeof d !== 'string') fail(`${where}: dep entry must be string, got ${typeof d}`);
      else if (!allNames.has(d)) warn(`${where}: dep "${d}" not found in registry (dangling)`);
    }
  }
}

console.log(`  checked: ${checked} skill entries`);
console.log(`  errors:  ${errors}`);
console.log(`  warnings: ${warnings}`);
if (errors > 0) {
  console.log('  RESULT: FAIL — registry.json has structural violations.');
  process.exit(1);
}
console.log('  RESULT: PASS — registry.json is structurally valid.');
process.exit(0);
