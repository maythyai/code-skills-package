#!/usr/bin/env node
/**
 * generate-triggers.mjs
 *
 * Auto-generates trigger words for unrouted skills (skills present in
 * registry.json but absent from triggers.yaml's trigger_index section).
 *
 * Strategy per skill category:
 *   reviewers       → "{lang} review", "{lang} code review", "review {lang} code", "{lang} 审查"
 *   build-resolvers → "{lang} build error", "{lang} 构建错误", "fix {lang} build"
 *   patterns        → "{lang} patterns", "{lang} best practices", "{lang} 最佳实践"
 *   testing         → "{lang} test", "{lang} testing", "{lang} 测试"
 *   cursor-rules    → "cursor rules {lang}", "{lang} cursor rules", "{lang} coding style"
 *   generic         → base phrase (spaces), base phrase (hyphens), domain keywords, action phrases
 *
 * Rules:
 *   - Never create duplicate trigger keys — if a key already exists, the new
 *     skill is appended to its existing skills list.
 *   - Backs up triggers.yaml before writing.
 *   - Prints a coverage summary at the end.
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REGISTRY_PATH = resolve(ROOT, 'csp-router', 'registry.json');
const TRIGGERS_PATH = resolve(ROOT, 'csp-router', 'triggers.yaml');
const BACKUP_PATH = TRIGGERS_PATH + '.pre-gen.bak';

// ── Chinese translations for common domain words ─────────────────────────────
const ZH = {
  review: '审查', review2: '代码审查', build: '构建', test: '测试',
  security: '安全', debug: '调试', deploy: '部署', refactor: '重构',
  plan: '规划', design: '设计', architecture: '架构', performance: '性能',
  documentation: '文档', docs: '文档', migration: '迁移', network: '网络',
  database: '数据库', api: '接口', ui: '界面', ux: '用户体验',
  frontend: '前端', backend: '后端', mobile: '移动端', web: '网页',
  error: '错误', fix: '修复', optimize: '优化', analyze: '分析',
  research: '研究', audit: '审计', scan: '扫描', monitor: '监控',
  workflow: '工作流', session: '会话', project: '项目', phase: '阶段',
  milestone: '里程碑', workspace: '工作区', skill: '技能', config: '配置',
  update: '更新', create: '创建', generate: '生成', validate: '验证',
  verify: '验证', quality: '质量', coverage: '覆盖率', patterns: '模式',
  'best practices': '最佳实践', 'code review': '代码审查',
  'build error': '构建错误', testing: '测试',
};

function zh(word) {
  return ZH[word.toLowerCase()] || null;
}

// ── Load registry ────────────────────────────────────────────────────────────
function loadRegistry(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const list = Array.isArray(data) ? data : data?.skills;
  if (!list) throw new Error('registry.json has no recognizable skills array');
  return new Set(list.map((e) => e?.name).filter(Boolean));
}

// ── Parse triggers.yaml ──────────────────────────────────────────────────────
// Returns:
//   lines          – array of lines (mutable)
//   triggerKeys    – Map<key, { keyLineIdx, skillsLineIdx, skills: string[] }>
//                    scanned across the ENTIRE file (trigger_index + stack_rules
//                    both contain quoted trigger keys)
//   insertBeforeIdx – line index of the first top-level section AFTER trigger_index
function parseTriggersYaml(path) {
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/);

  const sectionRe = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(#.*)?$/;
  const triggerKeyRe = /^(\s*)"((?:[^"\\]|\\.)*)"\s*:\s*(#.*)?$/;
  const skillsLineRe = /^(\s*)skills\s*:\s*\[(.*)\]\s*(#.*)?$/;

  const triggerKeys = new Map();
  let section = null;
  let insertBeforeIdx = lines.length; // default: end of file

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const secMatch = line.match(sectionRe);
    if (secMatch) {
      const name = secMatch[1];
      if (name === 'trigger_index') {
        section = name;
      } else if (section === 'trigger_index') {
        // First section after trigger_index → insert before this line
        insertBeforeIdx = i;
        section = name;
      } else {
        section = name;
      }
      continue;
    }

    // Scan ALL sections for quoted trigger keys (stack_rules also has them)
    const tkMatch = line.match(triggerKeyRe);
    if (tkMatch) {
      const key = tkMatch[2];
      if (triggerKeys.has(key)) continue; // already recorded — skip duplicates
      // Look ahead for the skills line (within next 3 lines)
      let skillsLineIdx = -1;
      let skills = [];
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const sm = lines[j].match(skillsLineRe);
        if (sm) {
          skillsLineIdx = j;
          skills = sm[2]
            .split(',')
            .map((s) => s.trim().replace(/^["']|["']$/g, '').trim())
            .filter(Boolean);
          break;
        }
        // Stop if we hit another trigger key or section
        if (lines[j].match(triggerKeyRe) || lines[j].match(sectionRe)) break;
      }
      triggerKeys.set(key, { keyLineIdx: i, skillsLineIdx, skills });
    }
  }

  return { lines, triggerKeys, insertBeforeIdx };
}

// ── Trigger generation ───────────────────────────────────────────────────────

function classifySkill(name) {
  const base = name.replace(/^csp-/, '');
  if (/cursor-rules/.test(base)) return 'cursor-rules';
  if (/-(reviewer|review)$/.test(base) || /-reviewer-/.test(base)) return 'reviewer';
  if (/-(build-resolver|build)$/.test(base)) return 'build-resolver';
  if (/-patterns$/.test(base)) return 'patterns';
  if (/-(testing|test)$/.test(base)) return 'testing';
  return 'generic';
}

// Extract the "language/domain" portion from a skill name
function extractDomain(name) {
  const base = name.replace(/^csp-/, '');
  const category = classifySkill(name);
  let domain = base;
  if (category === 'reviewer') domain = base.replace(/-(reviewer|review)$/, '').replace(/-reviewer-/, '-');
  else if (category === 'build-resolver') domain = base.replace(/-(build-resolver|build)$/, '');
  else if (category === 'patterns') domain = base.replace(/-patterns$/, '');
  else if (category === 'testing') domain = base.replace(/-(testing|test)$/, '');
  else if (category === 'cursor-rules') domain = base.replace(/^cursor-rules-/, '').replace(/-(coding-style|hooks|patterns|security|testing)$/, '');
  return domain;
}

function domainToPhrase(domain) {
  return domain.replace(/-/g, ' ');
}

function generateTriggers(name) {
  const category = classifySkill(name);
  const domain = extractDomain(name);
  const phrase = domainToPhrase(domain);
  const base = name.replace(/^csp-/, '');
  const triggers = new Set();

  if (category === 'reviewer') {
    triggers.add(`${phrase} review`);
    triggers.add(`${phrase} code review`);
    triggers.add(`review ${phrase} code`);
    const z = zh('review');
    if (z) triggers.add(`${phrase} ${z}`);
  } else if (category === 'build-resolver') {
    triggers.add(`${phrase} build error`);
    triggers.add(`fix ${phrase} build`);
    triggers.add(`${phrase} 构建错误`);
  } else if (category === 'patterns') {
    triggers.add(`${phrase} patterns`);
    triggers.add(`${phrase} best practices`);
    triggers.add(`${phrase} 最佳实践`);
  } else if (category === 'testing') {
    triggers.add(`${phrase} test`);
    triggers.add(`${phrase} testing`);
    triggers.add(`${phrase} 测试`);
  } else if (category === 'cursor-rules') {
    const lang = domain.replace(/-(coding-style|hooks|patterns|security|testing)$/, '');
    const suffix = base.replace(/^cursor-rules-/, '').replace(/^.*?-/, '');
    triggers.add(`cursor rules ${lang}`);
    triggers.add(`${lang} cursor rules`);
    if (suffix && suffix !== lang) triggers.add(`${lang} ${suffix.replace(/-/g, ' ')}`);
  } else {
    // Generic: base phrase with spaces + hyphens + domain keywords + action phrases
    triggers.add(phrase);
    if (phrase !== base) triggers.add(base); // hyphenated form
    // Key domain words (individual words from the name)
    const words = base.split('-').filter((w) => w.length > 2 && !['csp', 'the', 'and'].includes(w));
    if (words.length > 0) {
      // First meaningful word as a keyword
      triggers.add(words[0]);
    }
    // Action phrases
    triggers.add(`review ${phrase}`);
    triggers.add(`fix ${phrase}`);
    const z = zh(words[0] || '');
    if (z) triggers.add(`${phrase} ${z}`);
  }

  // Always add the full skill name (without csp-) as a trigger for direct matching
  triggers.add(base);

  // Filter out empty strings and overly short tokens
  return [...triggers].filter((t) => t && t.length >= 2);
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('generate-triggers.mjs — adding triggers for unrouted skills\n');

  // Step 1: Backup
  copyFileSync(TRIGGERS_PATH, BACKUP_PATH);
  console.log(`Backup created: ${BACKUP_PATH}\n`);

  // Step 2: Load registry
  const registryNames = loadRegistry(REGISTRY_PATH);
  console.log(`Registry: ${registryNames.size} skills\n`);

  // Step 3: Parse triggers.yaml
  const { lines, triggerKeys, insertBeforeIdx } = parseTriggersYaml(TRIGGERS_PATH);

  // Step 4: Find referenced skills (any csp-* token in the file that exists in registry)
  const raw = lines.join('\n');
  const referenced = new Set();
  const cspRe = /csp-[a-z0-9-]+/g;
  let m;
  while ((m = cspRe.exec(raw)) !== null) {
    if (registryNames.has(m[0])) referenced.add(m[0]);
  }

  const unrouted = [...registryNames].filter((n) => !referenced.has(n)).sort();
  console.log(`Already routed: ${referenced.size} skills`);
  console.log(`Unrouted:       ${unrouted.length} skills\n`);

  if (unrouted.length === 0) {
    console.log('Nothing to do — all skills are already routed.');
    return;
  }

  // Step 5: Generate triggers and build new entries
  // newEntries: Map<triggerKey, Set<skillName>>  (for keys not yet in the file)
  // existingUpdates: Map<triggerKey, Set<skillName>>  (for keys already in the file)
  const newEntries = new Map();
  const existingUpdates = new Map();
  const skillTriggerCount = new Map(); // skill → number of triggers assigned

  for (const skill of unrouted) {
    const triggers = generateTriggers(skill);
    skillTriggerCount.set(skill, triggers.length);

    for (const trigger of triggers) {
      if (triggerKeys.has(trigger)) {
        // Existing key — add skill if not already present
        const entry = triggerKeys.get(trigger);
        if (!entry.skills.includes(skill)) {
          if (!existingUpdates.has(trigger)) existingUpdates.set(trigger, new Set());
          existingUpdates.get(trigger).add(skill);
        }
      } else {
        if (!newEntries.has(trigger)) newEntries.set(trigger, new Set());
        newEntries.get(trigger).add(skill);
      }
    }
  }

  // Step 6: Apply existing-key updates (modify skills lines in-place)
  let updatedCount = 0;
  for (const [key, skillsToAdd] of existingUpdates) {
    const entry = triggerKeys.get(key);
    if (entry.skillsLineIdx < 0) continue; // no skills line found — skip
    const line = lines[entry.skillsLineIdx];
    const sm = line.match(/^(\s*)skills\s*:\s*\[(.*)\]\s*(#.*)?$/);
    if (!sm) continue;
    const indent = sm[1];
    const comment = sm[3] || '';
    const existing = sm[2]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [...existing, ...[...skillsToAdd].map((s) => s)];
    lines[entry.skillsLineIdx] = `${indent}skills: [${merged.join(', ')}]${comment ? ' ' + comment : ''}`;
    updatedCount++;
  }

  // Step 7: Build new trigger entry blocks
  const newBlocks = [];
  newBlocks.push('');
  newBlocks.push('  # ─── auto-generated triggers (generate-triggers.mjs) ───');

  const sortedNewKeys = [...newEntries.keys()].sort();
  for (const key of sortedNewKeys) {
    const skills = [...newEntries.get(key)].sort();
    // Escape double quotes in the key for YAML
    const escapedKey = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    newBlocks.push(`  "${escapedKey}":`);
    newBlocks.push(`    skills: [${skills.join(', ')}]`);
    newBlocks.push(`    weight: 40`);
  }

  // Step 8: Insert new blocks before the next top-level section
  lines.splice(insertBeforeIdx, 0, ...newBlocks);

  // Step 9: Write output
  writeFileSync(TRIGGERS_PATH, lines.join('\n'), 'utf8');

  // Step 10: Summary
  const totalNewKeys = newEntries.size;
  const totalUpdatedKeys = updatedCount;
  const skillsWithTriggers = unrouted.length;
  const newCoverage = referenced.size + skillsWithTriggers;
  const coveragePct = ((newCoverage / registryNames.size) * 100).toFixed(1);

  console.log('── Results ──');
  console.log(`  Unrouted skills processed:   ${skillsWithTriggers}`);
  console.log(`  New trigger keys added:      ${totalNewKeys}`);
  console.log(`  Existing keys updated:       ${totalUpdatedKeys}`);
  console.log('');
  console.log('── Coverage ──');
  console.log(`  Before: ${referenced.size}/${registryNames.size} (${((referenced.size / registryNames.size) * 100).toFixed(1)}%)`);
  console.log(`  After:  ${newCoverage}/${registryNames.size} (${coveragePct}%)`);
  console.log('');

  // Show a sample of generated triggers
  console.log('── Sample generated triggers (first 15 unrouted skills) ──');
  for (const skill of unrouted.slice(0, 15)) {
    const triggers = generateTriggers(skill);
    console.log(`  ${skill}`);
    console.log(`    → ${triggers.map((t) => `"${t}"`).join(', ')}`);
  }

  console.log('\nDone. Updated file written to:', TRIGGERS_PATH);
}

main();
