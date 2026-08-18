// contract-validator.mjs
// Validate a cross-layer test contract (.linked.yaml / .linked.json) against the schema in
// contract-schema.md. Zero npm dependencies; ships a focused indentation-based YAML-subset
// parser so the reference is self-contained and copy-paste-usable.
//
// Usage (direct):
//   node references/contract-validator.mjs path/to/x.linked.yaml [--strict]
//   node references/contract-validator.mjs path/to/x.linked.json
//
// As a module: import { parseContractYaml, loadContract, validateContract, report }.
// Top-level side effects run ONLY when invoked directly (not on import).
//
// Exit codes (direct): 0 = valid, 1 = errors

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Minimal YAML-subset parser (block maps, block seqs, scalars, flow {}/[])
// Handles the contract structure in contract-schema.md. Not a general YAML parser.
// ---------------------------------------------------------------------------
export function parseContractYaml(text) {
  const lines = text.replace(/\t/g, '  ').split('\n');
  let i = 0;
  const indentOf = (l) => { const m = l.match(/^ */); return m ? m[0].length : 0; };
  const findColon = (s) => {
    let inS = null;
    for (let k = 0; k < s.length; k++) {
      const ch = s[k];
      if (inS) { if (ch === inS) inS = null; continue; }
      if (ch === '"' || ch === "'") { inS = ch; continue; }
      if (ch === ':' && (k === s.length - 1 || s[k + 1] === ' ')) return k;
    }
    return -1;
  };
  const parseValue = (s) => {
    s = s.trim();
    if (s === '') return null;
    if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))
      return s.slice(1, -1);
    if (s === '[]') return [];
    if (s === '{}') return {};
    if (s[0] === '{' && s[s.length - 1] === '}') return parseFlowMap(s);
    if (s[0] === '[' && s[s.length - 1] === ']') return parseFlowSeq(s);
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null') return null;
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
    return s;
  };
  function splitFlow(s) {
    const out = []; let depth = 0, inS = null, cur = '';
    for (const ch of s) {
      if (inS) { cur += ch; if (ch === inS) inS = null; continue; }
      if (ch === '"' || ch === "'") { inS = ch; cur += ch; continue; }
      if (ch === '{' || ch === '[') { depth++; cur += ch; continue; }
      if (ch === '}' || ch === ']') { depth--; cur += ch; continue; }
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function parseFlowMap(s) {
    const obj = {};
    for (const pair of splitFlow(s.slice(1, -1))) {
      const c = findColon(pair);
      if (c < 0) continue;
      obj[pair.slice(0, c).trim()] = parseValue(pair.slice(c + 1));
    }
    return obj;
  }
  function parseFlowSeq(s) { return splitFlow(s.slice(1, -1)).map(parseValue); }
  function parseBlock(minIndent) {
    const line = lines[i];
    if (!line || line.trim() === '' || line.trim().startsWith('#')) return null;
    const ind = indentOf(line);
    if (ind < minIndent) return null;
    if (line.trimStart().startsWith('- ')) {
      const arr = [];
      while (lines[i] && indentOf(lines[i]) === ind && lines[i].trimStart().startsWith('-'))
        arr.push(parseSeqItem(ind));
      return arr;
    }
    const map = {};
    while (lines[i] && indentOf(lines[i]) === ind && !lines[i].trimStart().startsWith('-')) {
      const l = lines[i].trim();
      if (l === '' || l.startsWith('#')) { i++; continue; }
      const c = findColon(l);
      if (c < 0) { i++; continue; }
      const key = l.slice(0, c).trim();
      const rest = l.slice(c + 1).trim();
      i++;
      map[key] = rest === '' ? parseBlock(ind + 1) : parseValue(rest);
    }
    return map;
  }
  function parseSeqItem(seqIndent) {
    const content = lines[i].replace(/^(\s*)- /, '');
    const itemIndent = seqIndent + 2;
    if (content.trim() === '') { i++; return parseBlock(itemIndent); }
    const c = findColon(content);
    if (c < 0) { i++; return parseValue(content); }
    const map = {};
    const key = content.slice(0, c).trim();
    const rest = content.slice(c + 1).trim();
    i++;
    if (rest === '') map[key] = parseBlock(itemIndent + 1);
    else map[key] = parseValue(rest);
    while (lines[i] && indentOf(lines[i]) === itemIndent && !lines[i].trimStart().startsWith('-')) {
      const l = lines[i].trim();
      if (l === '' || l.startsWith('#')) { i++; continue; }
      const c2 = findColon(l);
      if (c2 < 0) { i++; continue; }
      const k2 = l.slice(0, c2).trim();
      const r2 = l.slice(c2 + 1).trim();
      i++;
      map[k2] = r2 === '' ? parseBlock(itemIndent + 1) : parseValue(r2);
    }
    return map;
  }
  const start = lines.findIndex((l) => l.trim() !== '' && l.trim() !== '---');
  i = start < 0 ? 0 : start;
  return parseBlock(0) || {};
}

export function loadContract(file) {
  const raw = readFileSync(file, 'utf8');
  return file.endsWith('.json') ? JSON.parse(raw) : parseContractYaml(raw);
}

// ---------------------------------------------------------------------------
// Validation rules (see contract-schema.md). Pure: returns {errors, warnings}.
// ---------------------------------------------------------------------------
export function validateContract(c) {
  const errors = [];
  const warnings = [];
  const need = (obj, key, ctx) => {
    if (obj?.[key] === undefined || obj[key] === null || obj[key] === '') {
      errors.push(`${ctx}: missing required field '${key}'`); return false;
    }
    return true;
  };
  need(c, 'test_id', 'contract');
  need(c, 'requirement', 'contract');
  if (!['transaction', 'seed-reset', 'none'].includes(c.isolation))
    errors.push(`contract: invalid isolation '${c.isolation}' (transaction|seed-reset|none)`);
  need(c, 'layers', 'contract');
  need(c, 'correlation', 'contract');

  const layers = c.layers || {};
  for (const k of ['ui_action', 'api', 'db', 'ui_effect'])
    if (!layers[k]) errors.push(`layers: missing '${k}' (all four layers required)`);

  const api = layers.api?.expect || {};
  need(api, 'method', 'layers.api.expect');
  need(api, 'path', 'layers.api.expect');
  if (api.status === undefined) errors.push('layers.api.expect: missing status');

  const normSql = (s) => String(s || '').replace(/\s+/g, ' ').replace(/:\w+/g, '?').trim().toLowerCase();
  const tablesOf = (sql) => {
    const out = []; const re = /(?:from|join|update|into)\s+([a-z_][a-z0-9_]*)/g; let m;
    while ((m = re.exec(sql))) out.push(m[1]); return out;
  };
  const db = layers.db || {};
  if (!Array.isArray(db.post) || db.post.length === 0)
    errors.push('layers.db.post: at least one post-action assertion required');

  const preQueries = new Set((db.pre || []).map((p) => normSql(p.query)));
  const preTables = new Set([...preQueries].map(tablesOf).flat());
  for (const [idx, inv] of (db.invariants || []).entries()) {
    if (inv?.delta === undefined) errors.push(`layers.db.invariants[${idx}]: missing delta`);
    if (!preQueries.has(normSql(inv?.query)))
      errors.push(`layers.db.invariants[${idx}]: no matching pre baseline — cannot compute delta without a pre snapshot of the same query`);
  }
  for (const [idx, p] of (db.post || []).entries()) {
    const t = tablesOf(normSql(p.query));
    if (t.length && !t.some((x) => preTables.has(x)))
      warnings.push(`layers.db.post[${idx}]: table(s) ${t.join(',')} not seen in pre — cannot prove change was caused by this action`);
  }
  const uiExpect = layers.ui_effect?.expect;
  if (!Array.isArray(uiExpect) || uiExpect.length === 0)
    errors.push('layers.ui_effect.expect: at least one assertion required');
  else if (!uiExpect.some((s) => /等于|不等于|新|delta|stock|order|\{.*\}/.test(String(s))))
    warnings.push('layers.ui_effect.expect: all assertions look static — suspected "走过场" E2E; assert a UI state derived from the DB change');

  const corr = c.correlation || {};
  if (!corr.key) errors.push('correlation: missing key (no alignment key = no causality)');
  return { errors, warnings };
}

// Print results; returns process exit code.
export function report(c, { errors, warnings }, { strict = false } = {}) {
  for (const e of errors) console.log(`❌ ${e}`);
  for (const w of warnings) console.log(`⚠️  ${w}`);
  if (!errors.length && !warnings.length) console.log(`✅ ${c.test_id}: contract valid`);
  else if (!errors.length) console.log(`✅ ${c.test_id}: valid with ${warnings.length} warning(s)`);
  return errors.length ? 1 : (strict && warnings.length ? 2 : 0);
}

// ---------------------------------------------------------------------------
// Direct-run entry point (only when invoked as a script, not on import)
// ---------------------------------------------------------------------------
function main() {
  const strict = process.argv.includes('--strict');
  const target = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
  if (!target) { console.error('Usage: contract-validator.mjs <file.linked.yaml|json> [--strict]'); process.exit(1); }
  const c = loadContract(target);
  process.exit(report(c, validateContract(c), { strict }));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(`file://${process.argv[1]}`);
if (isMain) main();
