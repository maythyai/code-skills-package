#!/usr/bin/env node
// build-page.mjs — Regenerate the CSP_DATA payload inside docs/csp-page/index.html
// Usage: node shared/scripts/build-page.mjs
//
// Data flow:
//   csp-router/registry.json  (authoritative skill list)  ─┐
//   csp-router/triggers.yaml  (trigger_index → en/zh words) ├─► CSP_DATA → index.html
//
// The CSP_DATA object embedded in index.html is DERIVED — never edit it by hand.
// Run `npm run build:registry` first so registry.json is current, then this script.

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const REGISTRY_PATH = 'csp-router/registry.json';
const TRIGGERS_PATH = 'csp-router/triggers.yaml';
const PAGE_PATH = 'docs/csp-page/index.html';

// ─── Layer presentation map (matches index.html legend) ───────────────
const LAYER_MAP = {
  0: { name: 'Router',   color: '#ef4444' },
  1: { name: 'Meta',     color: '#3b82f6' },
  2: { name: 'Workflow', color: '#22c55e' },
  3: { name: 'Patterns', color: '#a855f7' },
  4: { name: 'Runtime',  color: '#f97316' },
};

// CJK detection — splits trigger words into en/zh buckets.
const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/;

// ─── Parse trigger_index from triggers.yaml ──────────────────────────
// Returns { keyword: [skill, ...], ... }. Mirrors build-graph.mjs.
function parseTriggerIndex(text) {
  const index = {};
  const lines = text.split('\n');
  let inSection = false;
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed === 'trigger_index:') { inSection = true; continue; }
    // Leave at next top-level key
    if (inSection && line.search(/\S/) === 0 && trimmed.endsWith(':') && trimmed !== 'trigger_index:') break;
    if (!inSection) continue;

    const keyMatch = trimmed.match(/^(?:"([^"]+)"|'([^']+)'|([\w一-鿿]+)):\s*$/);
    if (keyMatch) {
      current = keyMatch[1] || keyMatch[2] || keyMatch[3];
      index[current] = [];
      continue;
    }

    if (trimmed.startsWith('skills:') && current) {
      const val = trimmed.slice(7).trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        index[current] = val.slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
    }
  }
  return index;
}

// Build skill → { en:Set, zh:Set } from the inverted trigger index.
function buildTriggerLookup(triggerIndex) {
  const lookup = {};
  for (const [word, skills] of Object.entries(triggerIndex)) {
    const bucket = CJK_RE.test(word) ? 'zh' : 'en';
    for (const skill of skills) {
      lookup[skill] = lookup[skill] || { en: new Set(), zh: new Set() };
      lookup[skill][bucket].add(word);
    }
  }
  return lookup;
}

// ─── Main ─────────────────────────────────────────────────────────────
console.log('🔨 Building CSP_DATA for docs/csp-page/index.html ...');

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const triggerIndex = parseTriggerIndex(fs.readFileSync(TRIGGERS_PATH, 'utf8'));
const triggerLookup = buildTriggerLookup(triggerIndex);

// Build skills array in the shape the render engine expects.
const skills = registry.skills.map((s) => {
  const lm = LAYER_MAP[s.layer] || { name: 'Unknown', color: '#71717a' };
  const found = triggerLookup[s.name] || { en: new Set(), zh: new Set() };
  // en always leads with the skill name itself (matches existing page behaviour).
  const en = [s.name, ...[...found.en].filter((w) => w !== s.name)];
  const zh = [...found.zh];
  return {
    name: s.name,
    description: s.description,
    origin: 'csp-native',
    category: s.category,
    layer: `L${s.layer}`,
    layer_name: lm.name,
    layer_color: lm.color,
    triggers: { en, zh },
  };
});

// ─── Aggregate stats ────────────────────────────────────────────────
const by_layer = {};
const by_category = {};
for (const s of skills) {
  by_layer[s.layer_name] = by_layer[s.layer_name] || { count: 0, layer: s.layer, color: s.layer_color };
  by_layer[s.layer_name].count++;
  by_category[s.category] = (by_category[s.category] || 0) + 1;
}

// "Reviewers / Analysts" stat card — transparent, name-based heuristic.
const reviewers = skills.filter((s) => /review|critic|analyst/i.test(s.name)).length;

const stats = {
  total: skills.length,
  by_layer,
  by_origin: { 'csp-native': skills.length },
  by_category,
  reviewers,
};

const cspData = { stats, skills };

// ─── Splice into index.html ──────────────────────────────────────────
const pageFull = path.join(ROOT, PAGE_PATH);
const html = fs.readFileSync(pageFull, 'utf8');

const startMarker = 'const CSP_DATA = {';
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) {
  console.error(`❌ Could not find "${startMarker}" in ${PAGE_PATH}`);
  process.exit(1);
}

// Find the matching close: the object literal is followed by ";" then a blank
// line and the "// RENDER ENGINE" banner. We brace-match from the opening "{".
const objOpen = html.indexOf('{', startIdx);
let depth = 0;
let endIdx = -1;
let inStr = false;
let strCh = '';
let prev = '';
for (let i = objOpen; i < html.length; i++) {
  const ch = html[i];
  if (inStr) {
    if (ch === strCh && prev !== '\\') inStr = false;
  } else if (ch === '"' || ch === "'") {
    inStr = true; strCh = ch;
  } else if (ch === '{') {
    depth++;
  } else if (ch === '}') {
    depth--;
    if (depth === 0) { endIdx = i; break; }
  }
  prev = ch;
}
if (endIdx === -1) {
  console.error('❌ Could not brace-match the CSP_DATA object literal.');
  process.exit(1);
}

// Replace from `const CSP_DATA = {` through the matching `}` (exclusive of any
// trailing `;`, which we re-emit). Preserve a trailing `;` if present.
let afterEnd = endIdx + 1;
if (html[afterEnd] === ';') afterEnd++;

const json = JSON.stringify(cspData, null, 2);
const replacement = `const CSP_DATA = ${json};`;
const newHtml = html.slice(0, startIdx) + replacement + html.slice(afterEnd);

if (newHtml === html) {
  console.log('✅ CSP_DATA already up to date — no changes.');
} else {
  fs.writeFileSync(pageFull, newHtml, 'utf8');
  console.log(`✅ Updated: ${PAGE_PATH}`);
}

// ─── Report ──────────────────────────────────────────────────────────
console.log(`📊 Total skills: ${stats.total}`);
for (const [name, info] of Object.entries(by_layer).sort((a, b) => a[1].layer.localeCompare(b[1].layer))) {
  console.log(`   ${info.layer} ${name}: ${info.count}`);
}
console.log(`   Reviewers / Analysts: ${reviewers}`);
const withTriggers = skills.filter((s) => s.triggers.en.length > 1 || s.triggers.zh.length).length;
console.log(`   Skills with extra triggers: ${withTriggers}`);
