#!/usr/bin/env node
// audit-registry.js — Registry consistency audit
// Usage: node shared/scripts/audit-registry.js
const fs = require('fs');
const path = require('path');

process.chdir(path.join(__dirname, '../..'));

const REGISTRY = 'csp-router/registry.json';
const r = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));

console.log('=== CSP Registry Audit ===');
console.log('Date: ' + new Date().toISOString().slice(0, 19));
console.log('');

// 1. MISSING paths
console.log('--- MISSING paths (active entries with non-existent files) ---');
const missing = [];
for (const s of r.skills) {
  if (!s.deprecated && s.path && !fs.existsSync(s.path)) {
    console.log('MISSING: ' + s.name + ' -> ' + s.path);
    missing.push(s);
  }
}
console.log('');

// 2. Orphan files
console.log('--- ORPHAN files (SKILL.md / agent .md not in registry) ---');
const regPaths = new Set(r.skills.map(s => s.path).filter(Boolean));
const excludePatterns = [
  /\/modes\//,
  /\/templates\//,
  /\/steps\//,
  /\/scripts\//,
  /\/references\//,
  /\/phases\//,
  /\/data\//,
  /README\.md$/,
  /INDEX\.md$/,
  /shared\//,
  /ARCHITECTURE\./,
  /MIGRATION\./,
  // commands/ and agents/ are command/agent definitions, not independent skills
  /\/commands\//,
  /\/agents\//,
  // Skill sub-files (test files, sub-modules, etc.)
  /test-pressure/,
  /test-academic/,
  /CREATION-LOG/,
  /PLAN_DOCUMENT/,
  /STYLE_PRESETS/,
  /data_contracts/,
  /si-/,
  // Reviewer sub-files in meta
  /code-reviewer\.md$/,
  /optimization-decision/,
  /plan-document-reviewer/,
  // writing-skills sub-files
  /anthropic-best-practices/,
  /persuasion-principles/,
  /testing-skills-with-subagents/,
  /CLAUDE_MD_TESTING/,
  /examples\/CLAUDE/,
];
const dirs = ['csp-meta', 'csp-workflow', 'csp-patterns', 'csp-runtime'];
let orphanCount = 0;
const orphans = [];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;
      const rel = full.replace(/^\.\/?/, '');
      if (excludePatterns.some(re => re.test(rel))) continue;
      if (regPaths.has(rel)) continue;
      console.log('ORPHAN: ' + rel);
      orphans.push(rel);
      orphanCount++;
    }
  }
  walk(dir);
}
console.log('Total orphans: ' + orphanCount);
console.log('');

// 3. Stats
console.log('--- Statistics ---');
const active = r.skills.filter(s => !s.deprecated);
const deprecated = r.skills.filter(s => s.deprecated);
const activeWithMissing = active.filter(s => s.path && !fs.existsSync(s.path));
console.log('Total registered: ' + r.skills.length);
console.log('Active: ' + active.length);
console.log('Deprecated: ' + deprecated.length);
console.log('Missing paths: ' + missing.length);
console.log('Orphans: ' + orphanCount);
console.log('total_skills field: ' + r.total_skills);
if (r.total_skills !== r.skills.length) {
  console.log('WARNING: total_skills mismatch');
}

// 4. Layer distribution
console.log('');
console.log('--- Layer Distribution ---');
const layers = {};
for (const s of r.skills) {
  if (s.deprecated || !s.path) continue;
  if (!layers[s.layer]) layers[s.layer] = 0;
  layers[s.layer]++;
}
for (const [k, v] of Object.entries(layers).sort((a, b) => a[0] - b[0])) {
  console.log('Layer ' + k + ': ' + v + ' skills');
}
