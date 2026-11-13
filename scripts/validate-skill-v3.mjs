// scripts/validate-skill-v3.mjs
// Validate SKILL.md files against v3 spec (frontmatter + body structure).
// Extends v2 validation with body quality checks, required sections by type,
// and a composite quality score.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseSimpleYaml } from '../shared/scripts/lib/yaml.mjs';

// ── Constants ───────────────────────────────────────────────────────────────

const VALID_PHASES = ['define', 'plan', 'build', 'verify', 'review', 'ship'];
const VALID_DOMAINS = ['language', 'quality', 'security', 'architecture', 'devops', 'database', 'testing', 'api', 'patterns', 'other'];
const VALID_ROLES = ['specialist', 'expert', 'architect', 'reviewer', 'guardian', 'wizard', 'orchestrator'];
const VALID_SCOPES = ['implementation', 'review', 'analysis', 'design', 'testing'];
const VALID_TYPES = ['technique', 'pattern', 'reference', 'workflow', 'guardian'];
const VALID_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Agent', 'NotebookEdit'];

// Required sections by skill type (as per SKILL-SPEC v3 §2.2)
// R = required, r = recommended, o = optional
const REQUIRED_SECTIONS = {
  technique: ['Purpose', 'When to Use', 'Process', 'Verification Checklist', 'Examples'],
  pattern: ['Purpose', 'When to Use', 'Process', 'Key Principles', 'Verification Checklist', 'Examples'],
  reference: ['Purpose', 'When to Use', 'Examples'],
  workflow: ['Purpose', 'When to Use', 'When NOT to Use', 'Routing/Dispatch Logic', 'Process', 'Verification Checklist', 'Completion Signal', 'Related Skills'],
  guardian: ['Purpose', 'When to Use', 'When NOT to Use', 'Routing/Dispatch Logic', 'Process', 'Key Principles', 'Anti-Patterns', 'Rationalization Defense', 'Verification Checklist'],
};

const RECOMMENDED_SECTIONS = {
  technique: ['When NOT to Use', 'Key Principles', 'Anti-Patterns', 'Related Skills'],
  pattern: ['When NOT to Use', 'Anti-Patterns', 'Related Skills'],
  reference: ['When NOT to Use', 'Process', 'Verification Checklist', 'Related Skills'],
  workflow: ['Key Principles', 'Anti-Patterns', 'Examples'],
  guardian: ['Examples', 'Related Skills'],
};

// Section header patterns (case-insensitive, multiline, English + Chinese)
const SECTION_HEADERS = [
  /^##\s+(Purpose|核心目的|概述)/im,
  /^##\s+(When to Use|适用场景|何时使用)/im,
  /^##\s+(When NOT to Use|不适用场景|何时不使用)/im,
  /^##\s+(Routing\s*\/?\s*Dispatch\s+Logic|分发逻辑|路由)/im,
  /^##\s+(Process|流程|使用方法|核心流程)/im,
  /^##\s+(Key Principles|核心原则|关键原则)/im,
  /^##\s+(Anti[- ]Patterns|反模式|常见错误)/im,
  /^##\s+(Rationalization\s+Defense|借口防御|合理化反驳)/im,
  /^##\s+(Verification\s+Checklist|检查清单|验证清单|完成检查)/im,
  /^##\s+(Completion\s+Signal|完成信号)/im,
  /^##\s+(Examples|示例|例子|快速开始示例)/im,
  /^##\s+(Related\s+Skills|相关技能|关联技能)/im,
];

const SECTION_NAMES = [
  'Purpose', 'When to Use', 'When NOT to Use', 'Routing/Dispatch Logic',
  'Process', 'Key Principles', 'Anti-Patterns', 'Rationalization Defense',
  'Verification Checklist', 'Completion Signal', 'Examples', 'Related Skills',
];

// ── Parsing ──────────────────────────────────────────────────────────────────

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { fm: null, body: content };
  try {
    const fm = parseSimpleYaml(match[1]);
    const body = content.slice(match[0].length).trim();
    return { fm, body };
  } catch (e) {
    return { fm: null, body: content, fmError: e.message };
  }
}

function detectSections(body) {
  const found = new Set();
  for (let i = 0; i < SECTION_HEADERS.length; i++) {
    if (SECTION_HEADERS[i].test(body)) {
      found.add(SECTION_NAMES[i]);
    }
  }
  return found;
}

// ── Body Quality Checks ─────────────────────────────────────────────────────

function checkDescriptionFormat(fm) {
  const issues = [];
  if (!fm?.description) return issues;
  const desc = fm.description.trim();
  if (!desc.toLowerCase().startsWith('use when')) {
    issues.push({
      severity: 'warn',
      message: `Description should start with "Use when..." — found: "${desc.slice(0, 60)}..."`,
    });
  }
  if (desc.length > 500) {
    issues.push({
      severity: 'warn',
      message: `Description is ${desc.length} chars (recommended ≤500). Long descriptions slow routing.`,
    });
  }
  return issues;
}

function checkBodyQuality(body, skillType) {
  const issues = [];
  const sections = detectSections(body);

  // Minimum body length
  const bodyWords = body.split(/\s+/).length;
  if (bodyWords < 100) {
    issues.push({
      severity: 'warn',
      message: `Body is only ${bodyWords} words (recommended ≥100). May lack sufficient detail.`,
    });
  }

  // Check required sections for this type
  if (skillType && REQUIRED_SECTIONS[skillType]) {
    for (const section of REQUIRED_SECTIONS[skillType]) {
      if (!sections.has(section)) {
        issues.push({
          severity: process.argv.includes('--strict') ? 'error' : 'warn',
          message: `Missing required section for type "${skillType}": ## ${section}`,
        });
      }
    }
  }

  // Check recommended sections for this type
  if (skillType && RECOMMENDED_SECTIONS[skillType]) {
    for (const section of RECOMMENDED_SECTIONS[skillType]) {
      if (!sections.has(section)) {
        issues.push({
          severity: 'info',
          message: `Missing recommended section for type "${skillType}": ## ${section}`,
        });
      }
    }
  }

  // Check for code examples (required for technique, pattern, reference types)
  const hasCodeBlock = /```[\s\S]*?```/.test(body);
  const codeExampleTypes = ['technique', 'pattern', 'reference'];
  if (!skillType || codeExampleTypes.includes(skillType)) {
    if (!hasCodeBlock && (!skillType || codeExampleTypes.includes(skillType))) {
      issues.push({
        severity: process.argv.includes('--strict') ? 'error' : 'warn',
        message: 'No code block found. technique/pattern/reference skills should include at least one code example.',
      });
    }
  }

  // Anti-pattern detection
  const hasTodo = /\bTODO\b|\bTBD\b|\bFIXME\b/i.test(body);
  if (hasTodo) {
    issues.push({
      severity: 'warn',
      message: 'Body contains TODO/TBD/FIXME markers — incomplete content.',
    });
  }

  // Empty section detection
  const emptySectionMatch = body.match(/^##\s+.+$/gm);
  if (emptySectionMatch) {
    // Check if any section is followed by another section immediately (empty section)
    const lines = body.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^##\s+/.test(lines[i]) && /^##\s+/.test(lines[i + 1])) {
        issues.push({
          severity: 'warn',
          message: `Section "${lines[i].replace(/^##\s+/, '')}" appears to be empty (immediately followed by another section).`,
        });
      }
    }
  }

  // Check for Verification Checklist items
  if (sections.has('Verification Checklist')) {
    const checklistItems = (body.match(/- \[[ x]\]/gi) || []).length;
    if (checklistItems < 3) {
      issues.push({
        severity: 'warn',
        message: `Verification Checklist has only ${checklistItems} checkbox items (recommended ≥3).`,
      });
    }
  }

  return issues;
}

function checkFrontmatter(fm, filePath) {
  const issues = [];

  if (!fm.name) issues.push({ severity: 'error', message: 'Missing required field: name' });
  if (!fm.description) issues.push({ severity: 'error', message: 'Missing required field: description' });
  if (!fm.layer && fm.layer !== 0) issues.push({ severity: 'error', message: 'Missing required field: layer' });
  if (!fm.category) issues.push({ severity: 'error', message: 'Missing required field: category' });

  if (fm.phase && !VALID_PHASES.includes(fm.phase))
    issues.push({ severity: 'error', message: `Invalid phase: ${fm.phase} (valid: ${VALID_PHASES.join(', ')})` });
  if (fm.domain && !VALID_DOMAINS.includes(fm.domain))
    issues.push({ severity: 'error', message: `Invalid domain: ${fm.domain}` });
  if (fm.role && !VALID_ROLES.includes(fm.role))
    issues.push({ severity: 'error', message: `Invalid role: ${fm.role} (valid: ${VALID_ROLES.join(', ')})` });
  if (fm.scope && !VALID_SCOPES.includes(fm.scope))
    issues.push({ severity: 'error', message: `Invalid scope: ${fm.scope}` });
  if (fm.type && !VALID_TYPES.includes(fm.type))
    issues.push({ severity: 'error', message: `Invalid type: ${fm.type} (valid: ${VALID_TYPES.join(', ')})` });

  if (fm.tools) {
    if (!Array.isArray(fm.tools)) {
      issues.push({ severity: 'error', message: 'tools must be an array' });
    } else {
      for (const tool of fm.tools) {
        if (!VALID_TOOLS.includes(tool))
          issues.push({ severity: 'error', message: `Invalid tool: ${tool}` });
      }
    }
  }

  // v3 coverage warnings
  if (!fm.type) issues.push({ severity: 'info', message: 'Missing v3 field: type (recommended for section-based validation)' });
  if (!fm.phase) issues.push({ severity: 'info', message: 'Missing v2 field: phase' });
  if (!fm.domain) issues.push({ severity: 'info', message: 'Missing v2 field: domain' });
  if (!fm.role) issues.push({ severity: 'info', message: 'Missing v2 field: role' });

  return { issues, isV2: !!(fm.phase || fm.domain || fm.role), isV3: !!fm.type };
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function computeScore(fmIssues, bodyIssues, body, sections, skillType) {
  let score = 100;

  // Frontmatter errors
  const fmErrors = fmIssues.filter(i => i.severity === 'error').length;
  const fmWarnings = fmIssues.filter(i => i.severity === 'warn').length;
  score -= fmErrors * 15;
  score -= fmWarnings * 3;

  // Body errors and warnings
  const bodyErrors = bodyIssues.filter(i => i.severity === 'error').length;
  const bodyWarnings = bodyIssues.filter(i => i.severity === 'warn').length;
  score -= bodyErrors * 15;
  score -= bodyWarnings * 5;

  // Section completeness bonus
  if (skillType && REQUIRED_SECTIONS[skillType]) {
    const required = REQUIRED_SECTIONS[skillType];
    const present = required.filter(s => sections.has(s)).length;
    const ratio = present / required.length;
    if (ratio === 1) score += 5; // all required sections present
  }

  // Code example bonus
  if (/```[\s\S]*?```/.test(body)) score += 3;

  // Checklist bonus
  const checklistItems = (body.match(/- \[[ x]\]/gi) || []).length;
  if (checklistItems >= 5) score += 2;

  return Math.max(0, Math.min(100, score));
}

// ── File Discovery ───────────────────────────────────────────────────────────

function findSkills(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      const skillMd = join(full, 'SKILL.md');
      if (existsSync(skillMd)) results.push(skillMd);
      results.push(...findSkills(full));
    }
  }
  return results;
}

// ── Output ───────────────────────────────────────────────────────────────────

function printIssues(issues, indent = '   ') {
  for (const issue of issues) {
    const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${indent}${icon} [${issue.severity}] ${issue.message}`);
  }
}

function getScoreEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const target = process.argv[2] || '.';
  const root = resolve(target);

  let skillFiles;
  if (statSync(root).isFile()) {
    skillFiles = [root];
  } else {
    skillFiles = findSkills(root);
  }

  if (skillFiles.length === 0) {
    console.log('No SKILL.md files found.');
    process.exit(0);
  }

  let pass = 0, fail = 0, v2Count = 0, v3Count = 0;
  const scores = [];

  for (const file of skillFiles) {
    try {
      const content = readFileSync(file, 'utf8');
      const { fm, body, fmError } = extractFrontmatter(content);

      if (!fm) {
        console.log(`⚠️  ${file}: No frontmatter found${fmError ? ` (${fmError})` : ''}`);
        fail++;
        continue;
      }

      // Frontmatter validation
      const { issues: fmIssues, isV2, isV3 } = checkFrontmatter(fm, file);
      if (isV2) v2Count++;
      if (isV3) v3Count++;

      // Body validation
      const skillType = fm.type || null;
      const bodyIssues = checkBodyQuality(body, skillType);
      const descIssues = checkDescriptionFormat(fm);

      const allIssues = [...fmIssues, ...descIssues, ...bodyIssues];
      const errors = allIssues.filter(i => i.severity === 'error');
      const warnings = allIssues.filter(i => i.severity === 'warn');
      const infos = allIssues.filter(i => i.severity === 'info');

      // Score
      const sections = detectSections(body);
      const score = computeScore(fmIssues, bodyIssues, body, sections, skillType);

      if (errors.length > 0) {
        console.log(`\n${getScoreEmoji(score)} ${file} [score: ${score}]`);
        printIssues(errors);
        if (warnings.length > 0) printIssues(warnings.slice(0, 3)); // first 3 warnings
        if (warnings.length > 3) console.log(`   ... and ${warnings.length - 3} more warnings`);
        fail++;
      } else if (warnings.length > 0) {
        console.log(`\n${getScoreEmoji(score)} ${file} [score: ${score}]`);
        printIssues(warnings.slice(0, 5)); // first 5 warnings
        if (warnings.length > 5) console.log(`   ... and ${warnings.length - 5} more warnings`);
        pass++;
      } else {
        // Clean — only show in verbose mode
        if (process.argv.includes('--verbose')) {
          console.log(`\n${getScoreEmoji(score)} ${file} [score: ${score}] — clean`);
        }
        pass++;
      }

      scores.push({ file, score, type: skillType || 'unknown', tier: isV3 ? 'v3' : isV2 ? 'v2' : 'v1' });
    } catch (e) {
      console.log(`\n❌ ${file}: ${e.message}`);
      fail++;
    }
  }

  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log('Summary');
  console.log(`${'─'.repeat(60)}`);
  console.log(`Total: ${skillFiles.length} | Pass: ${pass} | Fail: ${fail}`);
  console.log(`V2 skills: ${v2Count} | V3 skills: ${v3Count}`);

  if (scores.length > 0) {
    const avgScore = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
    scores.sort((a, b) => b.score - a.score);
    console.log(`Average score: ${avgScore}/100`);
    console.log(`Top 3:`);
    scores.slice(0, 3).forEach(s => console.log(`  ${getScoreEmoji(s.score)} ${s.score} — ${s.file} [${s.tier}]`));
    if (fail === 0 && scores.filter(s => s.score < 70).length > 0) {
      console.log(`\nLowest: ${scores[scores.length - 1].file} (${scores[scores.length - 1].score}/100)`);
    }
  }

  console.log(`\nRun with --verbose for clean-skill details.`);
  console.log(`Run with --strict to treat section warnings as errors.`);

  process.exit(fail > 0 ? 1 : 0);
}

main();