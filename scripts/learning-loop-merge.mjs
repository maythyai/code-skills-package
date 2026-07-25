#!/usr/bin/env node
/**
 * learning-loop-merge.mjs — Post-extraction merge/dedup/decay/compression
 * Run after learning-loop-delta.mjs to maintain .csp/intel/ health.
 *
 * Usage: node scripts/learning-loop-merge.mjs [--dimension <name>] [--dry-run]
 *
 * Operations:
 * 1. Dedup: Jaccard similarity > 0.85 → keep newer, merge unique words
 * 2. Confidence decay: confidence * (0.95 ^ days_since_last_reinforcement)
 * 3. Archival: confidence < 0.3 → move to .csp/intel/archive/<dimension>.md
 * 4. Compression: > 2000 tokens → group by topic, keep top-3, consolidate rest
 * 5. Changelog: all operations logged to .csp/intel/changelog.jsonl
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, renameSync } from 'fs';
import { join, resolve } from 'path';

// --- Configuration ---
const INTEL_DIR = resolve(process.cwd(), '.csp', 'intel');
const ARCHIVE_DIR = join(INTEL_DIR, 'archive');
const CHANGELOG_FILE = join(INTEL_DIR, 'changelog.jsonl');

const DIMENSIONS = [
  'project-core',
  'user-needs',
  'developer-profile',
  'long-term-memory',
  'skill-feedback'
];

const SIMILARITY_THRESHOLD = 0.85;
const DECAY_RATE = 0.95;
const ARCHIVE_THRESHOLD = 0.3;
const COMPRESSION_TOKEN_LIMIT = 2000;
const CHARS_PER_TOKEN = 4;
const TOP_PER_TOPIC = 3;

// --- CLI args ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dimIdx = args.indexOf('--dimension');
const singleDimension = dimIdx !== -1 ? args[dimIdx + 1] : null;

if (singleDimension && !DIMENSIONS.includes(singleDimension)) {
  console.error(`Unknown dimension: "${singleDimension}". Valid: ${DIMENSIONS.join(', ')}`);
  process.exit(0); // Never block
}

const dimensionsToProcess = singleDimension ? [singleDimension] : DIMENSIONS;

// --- Entry parsing ---
// Entries look like: - [2026-07-21] content | confidence: 0.8 | source: direct-extraction
const ENTRY_RE = /^- \[(\d{4}-\d{2}-\d{2})\] (.+?) \| confidence: ([\d.]+) \| source: (.+?)(?:\s*\|.*)?$/;

function parseEntries(content) {
  const entries = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(ENTRY_RE);
    if (match) {
      entries.push({
        lineIndex: i,
        date: match[1],
        content: match[2],
        confidence: parseFloat(match[3]),
        source: match[4].trim(),
        raw: lines[i]
      });
    }
  }
  return entries;
}

function entryToLine(entry) {
  return `- [${entry.date}] ${entry.content} | confidence: ${entry.confidence.toFixed(3)} | source: ${entry.source}`;
}

// --- Jaccard similarity on word sets ---
function wordSet(text) {
  return new Set(
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1)
  );
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// --- Topic extraction (first noun phrase heuristic) ---
function extractTopic(content) {
  // Heuristic: take first 3 meaningful words as topic key
  const words = content
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'were', 'has', 'have', 'will', 'would', 'could', 'should'].includes(w.toLowerCase()));
  return words.slice(0, 3).join(' ').toLowerCase() || 'general';
}

// --- Changelog ---
function appendChangelog(entry) {
  if (dryRun) return;
  const line = JSON.stringify({ ...entry, ts: new Date().toISOString(), tool: 'learning-loop-merge' }) + '\n';
  try {
    if (!existsSync(INTEL_DIR)) mkdirSync(INTEL_DIR, { recursive: true });
    appendFileSync(CHANGELOG_FILE, line);
  } catch {
    // Silent — never block
  }
}

// --- Main processing ---
function processDimension(dimName) {
  const dimFile = join(INTEL_DIR, `${dimName}.md`);
  if (!existsSync(dimFile)) {
    return { dim: dimName, skipped: true, reason: 'file not found' };
  }

  const originalContent = readFileSync(dimFile, 'utf8');
  const entries = parseEntries(originalContent);

  if (entries.length === 0) {
    return { dim: dimName, skipped: true, reason: 'no entries' };
  }

  const stats = { deduped: 0, decayed: 0, archived: 0, compressed: 0 };
  const now = new Date();
  let workingEntries = [...entries];

  // --- Step 1: Dedup (Jaccard > 0.85) ---
  const wordSets = workingEntries.map(e => wordSet(e.content));
  const toRemove = new Set();

  for (let i = 0; i < workingEntries.length; i++) {
    if (toRemove.has(i)) continue;
    for (let j = i + 1; j < workingEntries.length; j++) {
      if (toRemove.has(j)) continue;
      const sim = jaccardSimilarity(wordSets[i], wordSets[j]);
      if (sim > SIMILARITY_THRESHOLD) {
        // Keep the newer entry (later date), merge unique words from older
        const [older, newer] = workingEntries[i].date <= workingEntries[j].date ? [i, j] : [j, i];
        // Merge unique words from older into newer content
        const olderWords = wordSets[older];
        const newerWords = wordSets[newer];
        const uniqueFromOlder = [...olderWords].filter(w => !newerWords.has(w));
        if (uniqueFromOlder.length > 0 && uniqueFromOlder.length <= 5) {
          workingEntries[newer].content += ` (+${uniqueFromOlder.join(',')})`;
        }
        // Boost newer confidence slightly (reinforcement)
        workingEntries[newer].confidence = Math.min(1.0, workingEntries[newer].confidence + 0.05);
        toRemove.add(older);
        stats.deduped++;
      }
    }
  }

  workingEntries = workingEntries.filter((_, idx) => !toRemove.has(idx));

  // --- Step 2: Confidence decay ---
  for (const entry of workingEntries) {
    const entryDate = new Date(entry.date + 'T00:00:00Z');
    const daysSince = Math.max(0, (now - entryDate) / (1000 * 60 * 60 * 24));
    if (daysSince > 0) {
      const decayFactor = Math.pow(DECAY_RATE, daysSince);
      const newConfidence = entry.confidence * decayFactor;
      if (Math.abs(newConfidence - entry.confidence) > 0.001) {
        entry.confidence = Math.round(newConfidence * 1000) / 1000;
        stats.decayed++;
      }
    }
  }

  // --- Step 3: Archival (confidence < 0.3) ---
  const archived = workingEntries.filter(e => e.confidence < ARCHIVE_THRESHOLD);
  const active = workingEntries.filter(e => e.confidence >= ARCHIVE_THRESHOLD);
  stats.archived = archived.length;

  if (archived.length > 0 && !dryRun) {
    if (!existsSync(ARCHIVE_DIR)) mkdirSync(ARCHIVE_DIR, { recursive: true });
    const archiveFile = join(ARCHIVE_DIR, `${dimName}.md`);
    const dateHeader = `\n## Archived ${now.toISOString().split('T')[0]}\n\n`;
    const archiveLines = archived.map(e => entryToLine(e)).join('\n');
    try {
      appendFileSync(archiveFile, dateHeader + archiveLines + '\n');
    } catch {
      // Silent
    }
  }

  workingEntries = active;

  // --- Step 4: Compression (> 2000 tokens) ---
  const totalChars = workingEntries.reduce((sum, e) => sum + entryToLine(e).length, 0);
  const estimatedTokens = totalChars / CHARS_PER_TOKEN;

  if (estimatedTokens > COMPRESSION_TOKEN_LIMIT && workingEntries.length > TOP_PER_TOPIC * 2) {
    // Group by topic
    const byTopic = new Map();
    for (const entry of workingEntries) {
      const topic = extractTopic(entry.content);
      if (!byTopic.has(topic)) byTopic.set(topic, []);
      byTopic.get(topic).push(entry);
    }

    const compressed = [];
    for (const [topic, topicEntries] of byTopic) {
      // Sort by confidence descending
      topicEntries.sort((a, b) => b.confidence - a.confidence);

      if (topicEntries.length <= TOP_PER_TOPIC) {
        compressed.push(...topicEntries);
      } else {
        // Keep top-N
        compressed.push(...topicEntries.slice(0, TOP_PER_TOPIC));

        // Consolidate remaining into a single entry
        const remaining = topicEntries.slice(TOP_PER_TOPIC);
        const avgConfidence = remaining.reduce((s, e) => s + e.confidence, 0) / remaining.length;
        const summary = remaining.map(e => e.content.split(' ').slice(0, 4).join(' ')).join('; ');
        compressed.push({
          date: now.toISOString().split('T')[0],
          content: `[consolidated: ${remaining.length} entries] ${summary.substring(0, 150)}`,
          confidence: Math.round(avgConfidence * 1000) / 1000,
          source: 'merge-compression'
        });
        stats.compressed += remaining.length - 1;
      }
    }

    workingEntries = compressed;
  }

  // --- Rebuild file ---
  if (!dryRun) {
    // Preserve non-entry lines (frontmatter, headings) and replace entries
    const lines = originalContent.split('\n');
    const entryLineIndices = new Set(entries.map(e => e.lineIndex));

    // Find the first entry line to know where entries start
    const firstEntryIdx = entries.length > 0 ? entries[0].lineIndex : lines.length;

    // Keep everything before first entry (frontmatter, headings)
    const header = lines.slice(0, firstEntryIdx);

    // Rebuild with working entries
    const newEntryLines = workingEntries.map(e => entryToLine(e));

    // Update updated_at in frontmatter if present
    let headerStr = header.join('\n');
    headerStr = headerStr.replace(
      /updated_at: "[^"]*"/,
      `updated_at: "${now.toISOString()}"`
    );

    const newContent = headerStr + '\n' + newEntryLines.join('\n') + '\n';

    // Atomic write
    const tmp = dimFile + '.tmp';
    writeFileSync(tmp, newContent);
    renameSync(tmp, dimFile);
  }

  // --- Changelog ---
  appendChangelog({
    dimension: dimName,
    action: 'merge',
    entries_before: entries.length,
    entries_after: workingEntries.length,
    deduped: stats.deduped,
    decayed: stats.decayed,
    archived: stats.archived,
    compressed: stats.compressed,
    dry_run: dryRun
  });

  return { dim: dimName, ...stats, before: entries.length, after: workingEntries.length };
}

// --- Run ---
function main() {
  console.log('=== learning-loop-merge ===');
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Dimensions: ${dimensionsToProcess.join(', ')}`);
  console.log('');

  if (!existsSync(INTEL_DIR)) {
    console.log('  .csp/intel/ not found. Nothing to do.');
    process.exit(0);
  }

  const results = [];
  for (const dim of dimensionsToProcess) {
    try {
      const result = processDimension(dim);
      results.push(result);
      if (result.skipped) {
        console.log(`  [${dim}] skipped (${result.reason})`);
      } else {
        console.log(`  [${dim}] ${result.before} → ${result.after} entries | dedup:${result.deduped} decay:${result.decayed} archive:${result.archived} compress:${result.compressed}`);
      }
    } catch (err) {
      console.error(`  [${dim}] error: ${err.message}`);
      results.push({ dim, error: err.message });
    }
  }

  console.log('');
  console.log('[DONE]');
  process.exit(0);
}

main();
