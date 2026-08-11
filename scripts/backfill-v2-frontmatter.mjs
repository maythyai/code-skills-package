#!/usr/bin/env node
/**
 * backfill-v2-frontmatter.mjs — add v2 phase/domain fields to V1 SKILL.md files.
 *
 * Why: only ~6.5% of skills carry the v2 `phase`/`domain` fields that the
 * confidence-router uses for state-aware routing; the rest fall back to keyword
 * matching. This script backfills those fields by INFERENCE (from category,
 * layer, name, and description keywords) — surgically inserting missing fields
 * without touching any existing content.
 *
 * Inference rules:
 *   domain  ← from category (reliable): meta/router→architecture, workflow/patterns→patterns
 *   phase   ← from name+description keyword match (high-confidence only; if no
 *             strong signal, phase is left absent rather than guessed wrong)
 *
 * Safety:
 *   - Only ADDS fields that are absent; never modifies or removes existing ones.
 *   - Inserts immediately before the closing `---`, preserving all bytes before it.
 *   - Files without frontmatter are skipped.
 *   - Default mode is --dry-run; pass --write to apply.
 *
 * Usage:
 *   node scripts/backfill-v2-frontmatter.mjs            # dry-run (report only)
 *   node scripts/backfill-v2-frontmatter.mjs --write    # apply changes
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseSimpleYaml } from '../shared/scripts/lib/yaml.mjs';

const ROOT_IDX = process.argv.indexOf('--root');
const ROOT = ROOT_IDX >= 0 && process.argv[ROOT_IDX + 1] ? resolve(process.argv[ROOT_IDX + 1]) : resolve('.');
const WRITE = process.argv.includes('--write');
const LAYERS = ['csp-meta', 'csp-workflow', 'csp-patterns', 'csp-runtime'];

const DOMAIN_BY_CATEGORY = {
  meta: 'architecture',
  router: 'architecture',
  workflow: 'patterns',
  patterns: 'patterns',
  runtime: 'architecture',
  agent: 'patterns',
  review: 'quality',
  tool: 'patterns',
  other: 'other',
};

const PHASE_RULES = [
  { phase: 'define', re: /\b(brainstorm|ideat|spec-contract|requirement gather|spec writing|define)\b/i },
  { phase: 'plan', re: /\b(plan|roadmap|writing-plans|architect|design doc|sketch)\b/i },
  { phase: 'build', re: /\b(build|implement|scaffold|tdd|coding|develop|code-review-fix|resolver)\b/i },
  { phase: 'verify', re: /\b(test|verify|e2e|regression|assert|coverage|qa)\b/i },
  { phase: 'review', re: /\b(review|audit|lint|inspect|adversarial)\b/i },
  { phase: 'ship', re: /\b(ship|release|deploy|publish|changelog|version bump)\b/i },
];

function inferPhase(name, description, layer) {
  const hay = `${name} ${description || ''}`;
  // Strong match: must match a keyword (case-insensitive whole word)
  for (const r of PHASE_RULES) {
    if (r.re.test(hay)) return r.phase;
  }
  // Fallback: layer-based default. Keyword inference misses many skills whose
  // name/description has no strong phase signal; a layer default is a reasonable
  // conservative guess (router treats phase as a soft confidence signal, not a gate).
  const n = String(layer || '').replace(/[^0-9]/g, '');
  const layerDefault = { '1': 'define', '2': 'build', '3': 'build', '4': 'build', '5': 'build' };
  return layerDefault[n] || null;
}

function inferDomain(category) {
  return DOMAIN_BY_CATEGORY[category] || null;
}

function findSkillFiles() {
  const out = [];
  const walk = (dir) => {
    try {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        let st;
        try { st = statSync(full); } catch { continue; }
        if (st.isDirectory()) walk(full);
        else if (e === 'SKILL.md') out.push(full);
      }
    } catch {}
  };
  for (const L of LAYERS) {
    const sd = join(ROOT, L, 'skills');
    if (existsSync(sd)) walk(sd);
  }
  return out;
}

let scanned = 0, wouldChange = 0, written = 0, skipped = 0;
const byLayer = {};

for (const file of findSkillFiles()) {
  scanned++;
  let text = readFileSync(file, 'utf8');
  // frontmatter fence: leading ---\n...\n---
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) { skipped++; continue; }
  const fmText = m[1];
  let fm;
  try { fm = parseSimpleYaml(fmText); } catch { skipped++; continue; }

  const layer = String(fm.layer || '').replace(/[^0-9]/g, '');
  const layerKey = layer ? `L${layer}` : '?';
  byLayer[layerKey] = byLayer[layerKey] || { total: 0, v2: 0, backfilled: 0 };
  byLayer[layerKey].total++;
  const hadPhase = fm.phase !== undefined;
  const hadDomain = fm.domain !== undefined;
  if (hadPhase && hadDomain) { byLayer[layerKey].v2++; continue; }

  const name = fm.name || '';
  const desc = typeof fm.description === 'string' ? fm.description : '';
  const phase = hadPhase ? fm.phase : inferPhase(name, desc, fm.layer);
  const domain = hadDomain ? fm.domain : inferDomain(fm.category);

  const additions = [];
  if (!hadPhase && phase) additions.push(`phase: ${phase}`);
  if (!hadDomain && domain) additions.push(`domain: ${domain}`);
  if (!additions.length) { skipped++; continue; }

  wouldChange++;
  byLayer[layerKey].backfilled++;

  // Surgical insertion: append the new fields immediately before the closing ---.
  // We rebuild the file as: prefix(before frontmatter) + "---\n" + fmText + "\n" + additions.join("\n") + "\n---" + suffix.
  const before = text.slice(0, m.index + 4); // includes leading "---\n"
  // m[0] = "---\n<fmText>\n---"; the char right after m[0] is the rest
  const afterFm = text.slice(m.index + m[0].length);
  const newFmBlock = `${before}${fmText}\n${additions.join('\n')}\n---`;
  const newText = newFmBlock + afterFm;

  if (WRITE) {
    writeFileSync(file, newText);
    written++;
  } else {
    console.log(`  ${file.replace(ROOT + '/', '')}  →  ${additions.join(', ')}`);
  }
}

console.log('\n═══ backfill-v2-frontmatter ' + (WRITE ? '(APPLIED)' : '(DRY-RUN)') + ' ═══');
console.log(`  scanned:        ${scanned}`);
console.log(`  would-change:   ${wouldChange}`);
console.log(`  written:        ${written}`);
console.log(`  skipped:        ${skipped} (no frontmatter / parse error / no inferable fields)`);
console.log('  per-layer:');
for (const [k, v] of Object.entries(byLayer)) {
  console.log(`    ${k}: total=${v.total} already-v2=${v.v2} backfilled=${v.backfilled}`);
}
if (!WRITE && wouldChange > 0) console.log('\n  Run with --write to apply.');
