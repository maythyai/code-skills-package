#!/usr/bin/env node
/**
 * integrate-qoderwork-skills.mjs — one-shot port of selected qoderwork skills
 * into CSP. Adapts frontmatter to the v2 spec (csp- prefix, layer/category/
 * phase/domain/tools), preserves the body + references/scripts/templates,
 * drops qoderwork install-metadata (package.json with install_source/skill_id).
 *
 * Run once from the project root.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const SRC_ROOT = '/Users/cs/.qoderwork/skills';
const DST_ROOT = process.cwd();

// [qoderworkName, cspName, layerDir, layerNum, category, phase, domain, scope, tools]
const SKILLS = [
  ['responsive-design',     'csp-responsive-design',  'csp-patterns/skills', 3, 'patterns', 'build',  'patterns',     'implementation', '[Read, Write, Edit, Glob, Grep]'],
  ['analytics-data-analysis','csp-data-analysis',     'csp-patterns/skills', 3, 'patterns', 'build',  'database',     'implementation', '[Read, Write, Edit, Bash, Glob, Grep]'],
  ['all-round-paper-reader', 'csp-paper-reader',      'csp-patterns/skills', 3, 'patterns', 'review', 'other',        'analysis',        '[Read, Write, Bash, Glob, Grep, WebFetch, WebSearch]'],
  ['file-organizer',        'csp-file-organizer',     'csp-runtime/skills',  4, 'runtime',  'build',  'devops',       'implementation', '[Read, Write, Edit, Bash, Glob, Grep]'],
  ['web-artifacts-builder', 'csp-web-artifacts',      'csp-patterns/skills', 3, 'patterns', 'build',  'patterns',     'implementation', '[Read, Write, Edit, Bash, Glob, Grep]'],
  ['html-prototype',        'csp-html-prototype',     'csp-patterns/skills', 3, 'patterns', 'design', 'patterns',     'design',          '[Read, Write, Edit, Glob, Grep]'],
  ['frontend-design',       'csp-frontend-design',    'csp-patterns/skills', 3, 'patterns', 'design', 'patterns',     'design',          '[Read, Write, Edit, Glob, Grep]'],
];

function extractDesc(fmText) {
  // description may be scalar, `>-`, `|`, or multiline. Grab the first non-empty
  // logical line for the v2 description field.
  const lines = fmText.split('\n');
  let i = 0;
  while (i < lines.length && !/^description:/.test(lines[i])) i++;
  if (i >= lines.length) return '';
  let first = lines[i].replace(/^description:\s*/, '').replace(/^[>|][-+]?$/, '').trim();
  // strip surrounding quotes
  first = first.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  if (first) return first;
  // multiline: take following indented lines until blank or dedent
  let buf = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (!lines[j].startsWith(' ') && !lines[j].startsWith('\t')) break;
    if (lines[j].trim()) buf.push(lines[j].trim());
  }
  return buf.join(' ').slice(0, 240);
}

function copyTree(src, dst, skip = new Set()) {
  if (!existsSync(src)) return;
  mkdirSync(dst, { recursive: true });
  for (const e of readdirSync(src)) {
    if (skip.has(e)) continue;
    const s = join(src, e), d = join(dst, e);
    const st = statSync(s);
    if (st.isDirectory()) copyTree(s, d, skip);
    else copyFileSync(s, d);
  }
}

let ported = 0;
for (const [qname, cname, layerDir, layerNum, category, phase, domain, scope, tools] of SKILLS) {
  const src = join(SRC_ROOT, qname);
  const dst = join(DST_ROOT, layerDir, cname);
  if (!existsSync(join(src, 'SKILL.md'))) { console.error(`skip ${qname}: no SKILL.md`); continue; }
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  mkdirSync(dst, { recursive: true });

  // copy references/scripts/templates/README/LICENSE, skip qoderwork package.json
  copyTree(src, dst, new Set(['package.json']));

  // rewrite SKILL.md frontmatter
  const orig = readFileSync(join(src, 'SKILL.md'), 'utf8');
  const m = orig.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) { console.error(`skip ${qname}: no frontmatter`); continue; }
  const desc = extractDesc(m[1]);
  const body = m[2];
  const version = (m[1].match(/^version:\s*(.+)$/m) || [,'1.0.0'])[1].trim().replace(/["']/g, '');

  const newFm = [
    '---',
    `name: ${cname}`,
    `description: "${desc.replace(/"/g, '\\"')}"`,
    `version: ${version}`,
    `layer: ${layerNum}`,
    `category: ${category}`,
    `phase: ${phase}`,
    `domain: ${domain}`,
    `scope: ${scope}`,
    `tools: ${tools}`,
    `related_skills: []`,
    '---',
    '',
  ].join('\n');

  writeFileSync(join(dst, 'SKILL.md'), newFm + body);
  ported++;
  console.log(`  ✅ ${qname} → ${layerDir}/${cname}`);
}

console.log(`\nPorted ${ported} skills. Run: npm run build:all && npm run validate:all`);
