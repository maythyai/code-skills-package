#!/usr/bin/env node
/**
 * fix-triggers.mjs
 *
 * Fixes broken skill references and duplicate trigger keys in
 * csp-router/triggers.yaml based on the valid skill names in
 * csp-router/registry.json.
 *
 * Zero external dependencies — works with text directly using regex/string ops.
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REGISTRY_PATH = resolve(ROOT, 'csp-router', 'registry.json');
const TRIGGERS_PATH = resolve(ROOT, 'csp-router', 'triggers.yaml');
const BACKUP_PATH = TRIGGERS_PATH + '.bak';

// Keys whose bracketed list values hold skill names.
const SKILL_LIST_KEYS = new Set([
  'skills',
  'reviewers',
  'testers',
  'build_resolvers',
  'boost',
]);

// Known non-existent skills → replacement mapping (resolved at runtime)
const KNOWN_MAPPINGS = {
  'csp-implement': ['csp-implementation-phase', 'csp-executing-plans'],
  'csp-debug-session': ['csp-systematic-debugging'],
  'csp-rapid-prototype': ['csp-quick-dev', 'csp-brainstorming'],
  'csp-codebase-onboarding': ['csp-map-codebase', 'csp-explore'],
};

// ── Load registry ────────────────────────────────────────────────────────────
function loadRegistryNames(path) {
  const raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : data?.skills;
  if (!list) throw new Error('registry.json has no recognizable skills array');
  const names = new Set();
  for (const entry of list) {
    if (entry && typeof entry.name === 'string' && entry.name.length > 0) {
      names.add(entry.name);
    }
  }
  return names;
}

// ── Resolve a broken skill name ──────────────────────────────────────────────
function resolveSkillName(name, registryNames) {
  // Already valid
  if (registryNames.has(name)) return { action: 'keep', resolved: name };

  // Rule 1: If csp- + name exists → prefix it
  const prefixed = 'csp-' + name;
  if (registryNames.has(prefixed)) return { action: 'prefix', resolved: prefixed };

  // Rule 2: If name without csp- prefix exists → keep as is
  if (name.startsWith('csp-')) {
    const unprefixed = name.slice(4);
    if (registryNames.has(unprefixed)) return { action: 'keep', resolved: name };
  }

  // Rule 3: Known non-existent mappings
  if (KNOWN_MAPPINGS[name]) {
    for (const candidate of KNOWN_MAPPINGS[name]) {
      if (registryNames.has(candidate)) {
        return { action: 'map', resolved: candidate };
      }
    }
  }

  // Rule 4: No match → comment out
  return { action: 'comment', resolved: null };
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('fix-triggers.mjs — fixing broken references and duplicate keys\n');

  // Step 0: Backup
  copyFileSync(TRIGGERS_PATH, BACKUP_PATH);
  console.log(`Backup created: ${BACKUP_PATH}\n`);

  // Step 1: Load registry
  const registryNames = loadRegistryNames(REGISTRY_PATH);
  console.log(`Registry loaded: ${registryNames.size} valid skill names\n`);

  // Step 2: Read triggers.yaml
  const raw = readFileSync(TRIGGERS_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);

  // Tracking
  const changes = [];
  const commentedOut = [];

  // ── Phase 1: Fix duplicate trigger keys ──────────────────────────────────
  // Find all quoted trigger key lines and their positions
  const triggerKeyRe = /^(\s*)"((?:[^"\\]|\\.)*)"\s*:\s*(#.*)?$/;
  const listKeyRe = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[(.*)\]\s*(#.*)?$/;

  // Map: triggerKey -> [{lineIdx, skillsLineIdx, skillsContent, weightLineIdx, weightContent}]
  const triggerOccurrences = new Map();

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(triggerKeyRe);
    if (match) {
      const key = match[2];
      if (!triggerOccurrences.has(key)) triggerOccurrences.set(key, []);
      // Look ahead for skills and weight lines
      let skillsLineIdx = -1;
      let skillsContent = null;
      let weightLineIdx = -1;
      let weightContent = null;
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const lm = lines[j].match(listKeyRe);
        if (lm && lm[2] === 'skills') {
          skillsLineIdx = j;
          skillsContent = lm[3];
        }
        const wm = lines[j].match(/^\s*weight\s*:\s*(\d+)/);
        if (wm) {
          weightLineIdx = j;
          weightContent = wm[1];
        }
      }
      triggerOccurrences.get(key).push({
        lineIdx: i,
        skillsLineIdx,
        skillsContent,
        weightLineIdx,
        weightContent,
      });
    }
  }

  // Find duplicates and merge
  const linesToRemove = new Set();
  const duplicateFixes = [];

  for (const [key, occurrences] of triggerOccurrences) {
    if (occurrences.length <= 1) continue;

    // Merge all skills into the first occurrence
    const first = occurrences[0];
    const allSkills = new Set();

    // Parse skills from first occurrence
    if (first.skillsContent) {
      for (const s of first.skillsContent.split(',')) {
        const name = s.trim().replace(/^["']|["']$/g, '').trim();
        if (name) allSkills.add(name);
      }
    }

    // Merge skills from subsequent occurrences
    for (let k = 1; k < occurrences.length; k++) {
      const occ = occurrences[k];
      if (occ.skillsContent) {
        for (const s of occ.skillsContent.split(',')) {
          const name = s.trim().replace(/^["']|["']$/g, '').trim();
          if (name) allSkills.add(name);
        }
      }
      // Mark the duplicate key line and its associated lines for removal
      linesToRemove.add(occ.lineIdx);
      if (occ.skillsLineIdx >= 0) linesToRemove.add(occ.skillsLineIdx);
      if (occ.weightLineIdx >= 0) linesToRemove.add(occ.weightLineIdx);
    }

    // Update the first occurrence's skills line with merged list
    if (first.skillsLineIdx >= 0) {
      const indent = lines[first.skillsLineIdx].match(/^(\s*)/)[1];
      const mergedList = [...allSkills].join(', ');
      const oldLine = lines[first.skillsLineIdx];
      const newLine = `${indent}skills: [${mergedList}]`;
      lines[first.skillsLineIdx] = newLine;
      duplicateFixes.push({
        key,
        mergedSkills: [...allSkills],
        removedLines: occurrences.slice(1).map(o => o.lineIdx + 1),
        oldLine: oldLine.trim(),
        newLine: newLine.trim(),
      });
    }
  }

  if (duplicateFixes.length > 0) {
    console.log(`── Duplicate key fixes (${duplicateFixes.length}) ──`);
    for (const fix of duplicateFixes) {
      console.log(`  "${fix.key}": merged skills → [${fix.mergedSkills.join(', ')}]`);
      console.log(`    removed duplicate at line(s): ${fix.removedLines.join(', ')}`);
    }
    console.log('');
  }

  // ── Phase 2: Fix broken skill references ─────────────────────────────────
  // Determine current section for context
  const sectionRe = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(#.*)?$/;
  let currentSection = null;

  const prefixFixes = [];
  const mapFixes = [];

  for (let i = 0; i < lines.length; i++) {
    // Skip lines marked for removal
    if (linesToRemove.has(i)) continue;

    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // Track section
    const secMatch = line.match(sectionRe);
    if (secMatch) {
      currentSection = secMatch[1];
      continue;
    }

    // Match skill list lines
    const lkMatch = line.match(listKeyRe);
    if (!lkMatch) continue;

    const key = lkMatch[2];
    const inner = lkMatch[3];

    // Only process skill-list keys
    const isSkillKey =
      SKILL_LIST_KEYS.has(key) || (key === 'patterns' && currentSection === 'stack_rules');
    if (!isSkillKey) continue;

    // Parse individual skill names
    const items = inner.split(',');
    let modified = false;
    const newItems = [];

    for (const item of items) {
      const name = item.trim().replace(/^["']|["']$/g, '').trim();
      if (name === '') {
        newItems.push(item);
        continue;
      }

      // Skip non-skill tokens (regex patterns etc.)
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) {
        newItems.push(item);
        continue;
      }

      const resolution = resolveSkillName(name, registryNames);

      switch (resolution.action) {
        case 'keep':
          newItems.push(item);
          break;
        case 'prefix':
          newItems.push(item.replace(name, resolution.resolved));
          prefixFixes.push({ line: i + 1, from: name, to: resolution.resolved });
          modified = true;
          break;
        case 'map':
          newItems.push(item.replace(name, resolution.resolved));
          mapFixes.push({ line: i + 1, from: name, to: resolution.resolved });
          modified = true;
          break;
        case 'comment':
          // Mark for commenting — we'll handle at line level
          commentedOut.push({ line: i + 1, name, key });
          // Remove this item from the list
          modified = true;
          break;
      }
    }

    if (modified) {
      // Reconstruct the line
      const indent = lkMatch[1];
      const comment = lkMatch[4] || '';
      const filteredItems = newItems.filter(it => {
        const n = it.trim().replace(/^["']|["']$/g, '').trim();
        // Remove items that were commented out
        return !commentedOut.some(c => c.line === i + 1 && c.name === n);
      });

      if (filteredItems.length > 0) {
        const newInner = filteredItems.join(',');
        lines[i] = `${indent}${key}: [${newInner}]${comment ? ' ' + comment : ''}`;
      } else {
        // All items were invalid — comment out the entire line
        lines[i] = `# ${line} # FIXED: all skill references invalid, commented out`;
      }
    }
  }

  // ── Phase 3: Remove duplicate lines ──────────────────────────────────────
  const finalLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (!linesToRemove.has(i)) {
      finalLines.push(lines[i]);
    }
  }

  // ── Write output ─────────────────────────────────────────────────────────
  const output = finalLines.join('\n');
  writeFileSync(TRIGGERS_PATH, output, 'utf8');

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`── Prefix fixes (${prefixFixes.length}) ──`);
  // Group by from→to for readability
  const prefixGroups = new Map();
  for (const fix of prefixFixes) {
    const k = `${fix.from} → ${fix.to}`;
    if (!prefixGroups.has(k)) prefixGroups.set(k, []);
    prefixGroups.get(k).push(fix.line);
  }
  for (const [desc, lineNums] of prefixGroups) {
    console.log(`  ${desc}  (lines: ${lineNums.join(', ')})`);
  }
  console.log('');

  console.log(`── Mapping fixes (${mapFixes.length}) ──`);
  const mapGroups = new Map();
  for (const fix of mapFixes) {
    const k = `${fix.from} → ${fix.to}`;
    if (!mapGroups.has(k)) mapGroups.set(k, []);
    mapGroups.get(k).push(fix.line);
  }
  for (const [desc, lineNums] of mapGroups) {
    console.log(`  ${desc}  (lines: ${lineNums.join(', ')})`);
  }
  console.log('');

  console.log(`── Commented out (${commentedOut.length}) ──`);
  if (commentedOut.length === 0) {
    console.log('  none');
  } else {
    for (const c of commentedOut) {
      console.log(`  L${c.line}: ${c.name} (in "${c.key}" list) — no valid mapping found`);
    }
  }
  console.log('');

  console.log('── Summary ──');
  console.log(`  Duplicate keys merged:     ${duplicateFixes.length}`);
  console.log(`  Lines removed (dups):      ${linesToRemove.size}`);
  console.log(`  Prefix fixes (csp- added): ${prefixFixes.length}`);
  console.log(`  Mapping fixes:             ${mapFixes.length}`);
  console.log(`  Commented out:             ${commentedOut.length}`);
  console.log(`  Total changes:             ${prefixFixes.length + mapFixes.length + commentedOut.length + duplicateFixes.length}`);
  console.log('\nDone. Fixed file written to:', TRIGGERS_PATH);
}

main();
