#!/usr/bin/env node
/**
 * learning-loop-delta.mjs — Stop hook for csp-learning-loop
 *
 * Lightweight incremental extraction at response boundary.
 * Scans session transcript for extractable signals and merges
 * into .csp/intel/ dimension files.
 *
 * Contract:
 * - Reads JSON from stdin (transcript_path, session metadata)
 * - Always exits 0 (never blocks)
 * - Always outputs JSON to stdout
 * - Respects CSP_HOOK_PROFILE and CSP_DISABLED_HOOKS
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, appendFileSync } from 'fs';
import { join, resolve } from 'path';

const INTEL_DIR = resolve(process.cwd(), '.csp', 'intel');
const META_FILE = join(INTEL_DIR, '_meta.json');
const CHANGELOG_FILE = join(INTEL_DIR, 'changelog.jsonl');

// Profile gating
const profile = process.env.CSP_HOOK_PROFILE || 'standard';
const disabledHooks = (process.env.CSP_DISABLED_HOOKS || '').split(',').map(s => s.trim());

function shouldSkip() {
  if (profile === 'minimal') return true;
  if (disabledHooks.includes('learning-loop')) return true;
  return false;
}

function readStdin(timeoutMs = 2000) {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeoutMs);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
  });
}

function loadMeta() {
  try {
    if (existsSync(META_FILE)) {
      return JSON.parse(readFileSync(META_FILE, 'utf8'));
    }
  } catch {}
  return {
    version: 1,
    schema_version: '1.0',
    created_at: new Date().toISOString(),
    last_updated: '',
    session_count: 0,
    source_skills: ['csp-remember', 'csp-learner', 'skill-optimizer', 'csp-compound', 'csp-profile-user'],
    dimensions: {
      'project-core': { entries: 0, last_touched: '' },
      'user-needs': { entries: 0, last_touched: '' },
      'developer-profile': { entries: 0, last_touched: '' },
      'long-term-memory': { entries: 0, last_touched: '' },
      'skill-feedback': { entries: 0, last_touched: '' }
    }
  };
}

function saveMeta(meta) {
  const tmp = META_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(meta, null, 2));
  renameSync(tmp, META_FILE);
}

function appendChangelog(entry) {
  const line = JSON.stringify(entry) + '\n';
  try {
    appendFileSync(CHANGELOG_FILE, line);
  } catch {
    // Fallback: read + write
    let existing = '';
    if (existsSync(CHANGELOG_FILE)) {
      existing = readFileSync(CHANGELOG_FILE, 'utf8');
    }
    writeFileSync(CHANGELOG_FILE, existing + line);
  }
}

function loadDimension(name) {
  const file = join(INTEL_DIR, `${name}.md`);
  if (!existsSync(file)) return { frontmatter: {}, sections: {}, raw: '' };
  const raw = readFileSync(file, 'utf8');
  return { raw };
}

function extractSignals(transcript) {
  // Lightweight signal extraction from transcript text
  const signals = {
    'project-core': [],
    'user-needs': [],
    'developer-profile': [],
    'long-term-memory': [],
    'skill-feedback': []
  };

  if (!transcript || transcript.length < 100) return signals;

  // Detect explicit user preferences
  const prefPatterns = [
    /(?:我喜欢|我偏好|I prefer|I like|always use|以后都)/gi,
    /(?:不要|别|stop|don't|never|不要再)/gi,
    /(?:应该|应该用|should use|must|must be)/gi
  ];

  for (const pattern of prefPatterns) {
    const matches = transcript.match(pattern);
    if (matches) {
      for (const match of matches.slice(0, 5)) {
        signals['user-needs'].push({
          content: match.trim().substring(0, 200),
          confidence: 0.8,
          source: 'direct-extraction',
          explicit: true
        });
      }
    }
  }

  // Detect skill feedback signals
  const feedbackPatterns = [
    { pattern: /(?:perfect|exactly|对了|很好|正是我要的)/gi, type: 'positive' },
    { pattern: /(?:不对|wrong|怎么又|还是没|又错了)/gi, type: 'negative' }
  ];

  for (const { pattern, type } of feedbackPatterns) {
    const matches = transcript.match(pattern);
    if (matches) {
      for (const match of matches.slice(0, 3)) {
        signals['skill-feedback'].push({
          content: match.trim().substring(0, 200),
          confidence: 0.7,
          source: 'direct-extraction',
          gap_type: type === 'positive' ? 'positive' : 'negative',
          severity: 'medium'
        });
      }
    }
  }

  // Detect developer profile signals
  const langMatch = transcript.match(/(?:中文|Chinese|英文|English)/i);
  if (langMatch) {
    signals['developer-profile'].push({
      content: `Communication language preference: ${langMatch[0]}`,
      confidence: 0.85,
      source: 'direct-extraction',
      evidence_count: 1
    });
  }

  return signals;
}

async function main() {
  if (shouldSkip()) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  const input = await readStdin(2000);
  if (!input.trim()) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  try {
    const data = JSON.parse(input);
    const transcriptPath = data.transcript_path || '';
    const sessionId = data.session_id || 'unknown';

    // Read transcript if available
    let transcript = '';
    if (transcriptPath && existsSync(transcriptPath)) {
      try {
        transcript = readFileSync(transcriptPath, 'utf8').slice(-50000); // Last 50K chars
      } catch {}
    }

    // Ensure intel directory exists
    if (!existsSync(INTEL_DIR)) {
      mkdirSync(INTEL_DIR, { recursive: true });
    }

    const meta = loadMeta();
    const signals = extractSignals(transcript);
    const now = new Date().toISOString();

    // Process signals for each dimension
    for (const [dimension, entries] of Object.entries(signals)) {
      if (entries.length === 0) continue;

      const dimFile = join(INTEL_DIR, `${dimension}.md`);
      let content = '';
      if (existsSync(dimFile)) {
        content = readFileSync(dimFile, 'utf8');
      }

      // Append new entries to the appropriate section
      for (const entry of entries.slice(0, 3)) { // Max 3 entries per dimension per hook
        const date = now.split('T')[0];
        const entryLine = `- [${date}] ${entry.content} | confidence: ${entry.confidence} | source: ${entry.source}\n`;

        // Find section to append to (first ## heading)
        const sectionMatch = content.match(/(## [^\n]+\n)/);
        if (sectionMatch) {
          const insertPos = content.indexOf(sectionMatch[0]) + sectionMatch[0].length;
          // Check for placeholder
          const placeholder = '_Nothing captured yet. Will populate as sessions accumulate._';
          content = content.replace(placeholder + '\n', '');
          content = content.slice(0, insertPos) + entryLine + content.slice(insertPos);
        } else {
          content += `\n## Captured\n${entryLine}`;
        }
      }

      // Update frontmatter
      content = content.replace(
        /updated_at: "[^"]*"/,
        `updated_at: "${now}"`
      );
      content = content.replace(
        /session_id: "[^"]*"/,
        `session_id: "${sessionId}"`
      );

      // Atomic write
      const tmp = dimFile + '.tmp';
      writeFileSync(tmp, content);
      renameSync(tmp, dimFile);

      // Update meta
      meta.dimensions[dimension] = meta.dimensions[dimension] || { entries: 0, last_touched: '' };
      meta.dimensions[dimension].entries += entries.length;
      meta.dimensions[dimension].last_touched = now;

      // Changelog
      appendChangelog({
        ts: now,
        session: sessionId,
        dimension,
        action: 'append',
        entries_added: entries.length,
        entries_updated: 0,
        source: 'direct-extraction'
      });
    }

    // Update meta
    meta.last_updated = now;
    meta.session_count += 1;
    saveMeta(meta);

  } catch (error) {
    // Silent failure — never block
    process.stderr.write(`[learning-loop-delta] ${error.message}\n`);
  }

  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
}

main();
