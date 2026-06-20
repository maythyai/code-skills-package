#!/usr/bin/env node
// build-registry.mjs — Scan actual project files to generate registry.json (single source of truth)
// Usage: node shared/scripts/build-registry.mjs
//
// Scans all .md files in skill/agent/command/workflow/mode directories.
// Excludes references/, test files, internal docs.
//
// registry.json is DERIVED — never edit manually.

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const REGISTRY_OUTPUT = 'csp-router/registry.json';

// ─── Layer mapping ───────────────────────────────────────────────────
const LAYER_MAP = {
  'csp-router':   { layer: 0, category: 'router' },
  'csp-meta':     { layer: 1, category: 'meta' },
  'csp-workflow': { layer: 2, category: 'workflow' },
  'csp-patterns': { layer: 3, category: 'patterns' },
  'csp-runtime':  { layer: 4, category: 'runtime' },
};

function getLayerCategory(relPath) {
  const top = relPath.split('/')[0];
  return LAYER_MAP[top] || { layer: 9, category: 'unknown' };
}

// ─── Description extraction ──────────────────────────────────────────
// Handles YAML multi-line scalars (>, |, >+, |-, etc.) and avoids
// grabbing frontmatter keys or bullet points as fallback descriptions.

function extractYamlMultiLine(lines, startIdx) {
  // Collect continuation lines: non-empty, indented more than the key
  const collected = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === '') { collected.push(''); continue; }
    // Continuation lines must be indented (at least 2 spaces)
    if (/^\s{2,}/.test(raw) && !/^---/.test(raw.trim())) {
      collected.push(raw.trim());
    } else {
      break; // no longer indented → end of multi-line value
    }
  }
  // Fold: join non-empty lines with space, blank lines become \n
  return collected
    .reduce((acc, line) => {
      if (line === '') return acc + '\n';
      return acc ? acc + ' ' + line : line;
    }, '')
    .trim();
}

function extractDescription(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Try YAML frontmatter first
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (fmMatch) {
      const fmLines = fmMatch[1].split('\n');
      for (let i = 0; i < fmLines.length; i++) {
        const line = fmLines[i];
        const descKeyMatch = line.match(/^description:\s*(.*)$/);
        if (!descKeyMatch) continue;

        const inlineVal = descKeyMatch[1].trim();

        // Multi-line indicator: >, |, >+, |+, >-, |-, >|, etc.
        if (/^[>|][+\-]?\s*$/.test(inlineVal)) {
          const multiLine = extractYamlMultiLine(fmLines, i);
          if (multiLine && multiLine.length > 5) {
            return stripQuotes(multiLine).slice(0, 300);
          }
        } else if (inlineVal && inlineVal.length > 5) {
          const cleaned = stripQuotes(inlineVal);
          if (cleaned && !isBadDescription(cleaned)) return cleaned.slice(0, 300);
        }
      }
    }

    // Fallback: first meaningful prose line (skip frontmatter, headers,
    // bullet points, code fences, and key: value lines)
    let inFrontmatter = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '---') { inFrontmatter = !inFrontmatter; continue; }
      if (inFrontmatter) continue;
      if (!trimmed) continue;
      if (trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('```')) continue;
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) continue;
      if (/^[a-z_]+:\s/.test(trimmed)) continue; // yaml-like key: value
      if (trimmed.startsWith('|') || trimmed.startsWith('>')) continue;

      const sentence = trimmed.split(/[.。]/)[0].trim();
      if (sentence && sentence.length > 5 && !isBadDescription(sentence)) {
        return sentence.slice(0, 300);
      }
    }
  } catch { /* unreadable */ }
  return 'No description available';
}

function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Patterns that indicate a bad/unusable description
const BAD_PATTERNS = [
  /^<purpose>$/i,
  /^name:\s/i,
  /^-\s*\*\*Role\*\*/i,
  /^No description available$/i,
  /^TODO/i,
  /^FIXME/i,
  /^\[placeholder\]/i,
];

function isBadDescription(s) {
  return BAD_PATTERNS.some(p => p.test(s.trim()));
}

// ─── Exclusion rules ─────────────────────────────────────────────────
const EXCLUDE_DIRS = new Set([
  'references', 'reference', 'scripts', 'assets', 'examples', 'data',
  'phases', 'node_modules', '.git', 'tests', '__tests__',
  'templates', 'steps', 'hooks', 'modes',
]);

const EXCLUDE_FILE_PATTERNS = [
  /^CREATION[-_]?LOG/i,
  /^STYLE_PRESETS/i,
  /^PLAN_DOCUMENT/i,
  /^CLAUDE_MD_TESTING/i,
  /^si-/,
  /^test[-_](academic|pressure)/i,  // internal test files only
];

function shouldExclude(relPath) {
  const parts = relPath.split('/');

  // Exclude any path containing excluded directory
  for (const part of parts) {
    if (EXCLUDE_DIRS.has(part)) return true;
  }

  // Exclude matching file patterns
  const fileName = parts[parts.length - 1];
  for (const pattern of EXCLUDE_FILE_PATTERNS) {
    if (pattern.test(fileName)) return true;
  }

  // Exclude README
  if (/^readme/i.test(fileName)) return true;

  return false;
}

// ─── Build a registry entry ──────────────────────────────────────────
function makeEntry(relPath, name, description) {
  const { layer, category } = getLayerCategory(relPath);
  return {
    name,
    description: description || 'No description available',
    layer,
    category,
    triggers: { keywords: [], file_patterns: [], context: [] },
    stack_detection: false,
    path: relPath,
    deps: [],
    priority: 10,
  };
}

// ─── Name extraction rules by directory type ─────────────────────────
// commands: csp- prefix + basename
// cursor-rules: csp-cursor-rules- prefix + basename
// review-tools, doc-tools: csp- prefix + basename
// agents: basename (already has csp-)
// workflows, modes: basename
// SKILL.md: parent directory name, ensure csp- prefix
function extractName(relPath, fileName) {
  const parts = relPath.split('/');

  // SKILL.md → parent directory name, ensure csp- prefix
  if (fileName === 'SKILL.md') {
    const dirName = path.basename(path.dirname(relPath));
    return dirName.startsWith('csp-') ? dirName : 'csp-' + dirName;
  }

  const baseName = fileName.replace('.md', '');
  const dirName = parts.length > 2 ? parts[parts.length - 2] : '';

  // commands/ → add csp- prefix
  if (dirName === 'commands') {
    return baseName.startsWith('csp-') ? baseName : 'csp-' + baseName;
  }

  // cursor-rules/ → csp-cursor-rules- prefix to avoid conflicts with skills/ of same name
  // e.g. golang-patterns.md → csp-cursor-rules-golang-patterns
  if (dirName === 'cursor-rules') {
    return baseName.startsWith('csp-cursor-rules-') ? baseName : 'csp-cursor-rules-' + baseName;
  }

  // review-tools/, doc-tools/ → add csp- prefix
  if (dirName === 'review-tools' || dirName === 'doc-tools') {
    return baseName.startsWith('csp-') ? baseName : 'csp-' + baseName;
  }

  // agents/: use basename as-is (already has csp- prefix in filename)
  if (dirName === 'agents') {
    return baseName;
  }

  // workflows/, modes/: use basename as-is
  return baseName;
}

// ─── Scan skill directories (only SKILL.md at depth N/skill-name/SKILL.md) ─
function scanSkillDir(baseDir) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;

  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(baseDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    const relPath = skillMd.replace(ROOT + path.sep, '');
    const name = path.basename(path.dirname(relPath));
    const finalName = name.startsWith('csp-') ? name : 'csp-' + name;
    const desc = extractDescription(skillMd);
    results.push(makeEntry(relPath, finalName, desc));
  }

  return results;
}

// ─── Scan flat directories (all .md files, skip excluded dirs) ───────
function scanFlatDir(baseDir) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;

  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.name.endsWith('.md')) continue;
    if (shouldExclude(entry.name)) continue;
    const relPath = path.join(baseDir, entry.name).replace(ROOT + path.sep, '');
    const name = extractName(relPath, entry.name);
    if (!name) continue;
    const desc = extractDescription(path.join(baseDir, entry.name));
    results.push(makeEntry(relPath, name, desc));
  }

  return results;
}

// ─── Main ────────────────────────────────────────────────────────────
console.log('🔨 Building registry.json from project files...');

const allSkills = [];
const seen = new Set();

function addEntries(entries) {
  for (const e of entries) {
    if (seen.has(e.name)) continue;
    seen.add(e.name);
    allSkills.push(e);
  }
}

// 1. csp-router SKILL.md
if (fs.existsSync('csp-router/SKILL.md')) {
  addEntries([{
    ...makeEntry('csp-router/SKILL.md', 'csp-router', extractDescription('csp-router/SKILL.md')),
  }]);
}

// 2. Skill directories (SKILL.md only, depth 2)
for (const dir of [
  'csp-meta/skills',
  'csp-workflow/skills',
  'csp-patterns/skills',
  'csp-patterns/reviewers',
  'csp-patterns/build-resolvers',
  'csp-runtime/skills',
]) {
  addEntries(scanSkillDir(dir));
}

// 3. Flat directories (all .md files)
for (const dir of [
  'csp-patterns/skills/cursor-rules',
  'csp-patterns/commands',
  'csp-patterns/agents',  // has both subdirs with SKILL.md AND flat .md files
  'csp-patterns/review-tools',
  'csp-patterns/doc-tools',
  'csp-runtime/agents',
  'csp-runtime/commands',
  'csp-workflow/commands',
  'csp-workflow/agents',
  'csp-workflow/workflows',
]) {
  addEntries(scanFlatDir(dir));
}

// 4. csp-patterns/agents also has subdirectories with SKILL.md
addEntries(scanSkillDir('csp-patterns/agents'));

// Sort by path for stability
allSkills.sort((a, b) => a.path.localeCompare(b.path));

const registry = {
  version: '1.0',
  total_skills: allSkills.length,
  shards: [],
  skill_metadata: 'skill-metadata.yaml',
  skills: allSkills,
};

fs.writeFileSync(REGISTRY_OUTPUT, JSON.stringify(registry, null, 2), 'utf8');

console.log(`✅ Written: ${REGISTRY_OUTPUT}`);
console.log(`📊 Total entries: ${allSkills.length} (unique: ${seen.size})`);

// Layer breakdown
const byLayer = {};
for (const s of allSkills) {
  byLayer[s.layer] = (byLayer[s.layer] || 0) + 1;
}
for (const [layer, count] of Object.entries(byLayer).sort((a, b) => a[0] - b[0])) {
  console.log(`  Layer ${layer}: ${count}`);
}

// Type breakdown
const byType = {};
for (const s of allSkills) {
  const type = s.path.endsWith('SKILL.md') ? 'skill' :
               s.path.includes('/commands/') ? 'command' :
               s.path.includes('/agents/') ? 'agent' :
               s.path.includes('/workflows/') ? 'workflow' :
               s.path.includes('/modes/') ? 'mode' :
               s.path.includes('/cursor-rules/') ? 'cursor-rule' :
               s.path.includes('/review-tools/') ? 'review-tool' :
               s.path.includes('/doc-tools/') ? 'doc-tool' : 'other';
  byType[type] = (byType[type] || 0) + 1;
}
for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`);
}

// Description quality report
console.log('\n📝 Description quality:');
const badDescs = [];
for (const s of allSkills) {
  if (isBadDescription(s.description) || s.description.length < 15) {
    badDescs.push(s);
  }
}
if (badDescs.length === 0) {
  console.log('  ✅ All entries have valid descriptions');
} else {
  console.log(`  ⚠️  ${badDescs.length} entries need attention:`);
  for (const s of badDescs) {
    console.log(`     - ${s.name}: "${s.description.slice(0, 60)}"`);
  }
}
