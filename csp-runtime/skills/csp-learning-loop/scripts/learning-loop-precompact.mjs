#!/usr/bin/env node
/**
 * learning-loop-precompact.mjs — PreCompact hook for csp-learning-loop
 *
 * Captures critical context before compaction wipes it.
 * More aggressive extraction than delta mode since context
 * is about to be lost.
 *
 * Contract:
 * - Reads JSON from stdin (transcript_path, session metadata)
 * - Always exits 0 (never blocks)
 * - Always outputs JSON to stdout
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, appendFileSync } from 'fs';
import { join, resolve } from 'path';

const INTEL_DIR = resolve(process.cwd(), '.csp', 'intel');
const META_FILE = join(INTEL_DIR, '_meta.json');
const CHANGELOG_FILE = join(INTEL_DIR, 'changelog.jsonl');

const profile = process.env.CSP_HOOK_PROFILE || 'standard';
const disabledHooks = (process.env.CSP_DISABLED_HOOKS || '').split(',').map(s => s.trim());

function shouldSkip() {
  if (profile === 'minimal') return true;
  if (disabledHooks.includes('learning-loop')) return true;
  return false;
}

function readStdin(timeoutMs = 3000) {
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
    version: 1, schema_version: '1.0',
    created_at: new Date().toISOString(), last_updated: '',
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
  try { appendFileSync(CHANGELOG_FILE, line); } catch {}
}

/**
 * PreCompact extraction: more aggressive than delta.
 * Captures key facts, decisions, and insights that would be lost.
 */
function extractPreCompactSignals(transcript) {
  const signals = {
    'long-term-memory': [],
    'project-core': []
  };

  if (!transcript || transcript.length < 200) return signals;

  // Extract architecture/tech facts mentioned in conversation
  const techPatterns = [
    /(?:uses?|built with|framework|library|runtime|package manager)[:\s]+([^\n,;.]{5,80})/gi,
    /(?:architecture|pattern|convention|structure)[:\s]+([^\n,;.]{5,80})/gi
  ];

  for (const pattern of techPatterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null && signals['project-core'].length < 5) {
      signals['project-core'].push({
        content: match[0].trim().substring(0, 200),
        confidence: 0.7,
        source: 'precompact-extraction'
      });
    }
  }

  // Extract decisions and lessons
  const decisionPatterns = [
    /(?:decided to|chose|we use|the reason|because we|the fix was|learned that|gotcha)[:\s]+([^\n]{10,200})/gi,
    /(?:决定了|选择了|原因是|修复方法是|学到了|注意)[:\s]+([^\n]{10,200})/gi
  ];

  for (const pattern of decisionPatterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null && signals['long-term-memory'].length < 5) {
      signals['long-term-memory'].push({
        content: match[0].trim().substring(0, 200),
        confidence: 0.7,
        source: 'precompact-extraction'
      });
    }
  }

  return signals;
}

async function main() {
  if (shouldSkip()) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  const input = await readStdin(3000);
  if (!input.trim()) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    return;
  }

  try {
    const data = JSON.parse(input);
    const transcriptPath = data.transcript_path || '';
    const sessionId = data.session_id || 'unknown';

    let transcript = '';
    if (transcriptPath && existsSync(transcriptPath)) {
      try {
        transcript = readFileSync(transcriptPath, 'utf8').slice(-80000);
      } catch {}
    }

    if (!existsSync(INTEL_DIR)) {
      mkdirSync(INTEL_DIR, { recursive: true });
    }

    const meta = loadMeta();
    const signals = extractPreCompactSignals(transcript);
    const now = new Date().toISOString();

    for (const [dimension, entries] of Object.entries(signals)) {
      if (entries.length === 0) continue;

      const dimFile = join(INTEL_DIR, `${dimension}.md`);
      let content = '';
      if (existsSync(dimFile)) {
        content = readFileSync(dimFile, 'utf8');
      }

      const date = now.split('T')[0];
      const newLines = entries.map(e =>
        `- [${date}] ${e.content} | confidence: ${e.confidence} | source: ${e.source}`
      ).join('\n');

      // Append to first section
      const sectionMatch = content.match(/(## [^\n]+\n)/);
      if (sectionMatch) {
        const insertPos = content.indexOf(sectionMatch[0]) + sectionMatch[0].length;
        content = content.replace('_Nothing captured yet. Will populate as sessions accumulate._\n', '');
        content = content.slice(0, insertPos) + newLines + '\n' + content.slice(insertPos);
      } else {
        content += `\n## Captured\n${newLines}\n`;
      }

      content = content.replace(/updated_at: "[^"]*"/, `updated_at: "${now}"`);
      content = content.replace(/session_id: "[^"]*"/, `session_id: "${sessionId}"`);

      const tmp = dimFile + '.tmp';
      writeFileSync(tmp, content);
      renameSync(tmp, dimFile);

      meta.dimensions[dimension] = meta.dimensions[dimension] || { entries: 0, last_touched: '' };
      meta.dimensions[dimension].entries += entries.length;
      meta.dimensions[dimension].last_touched = now;

      appendChangelog({
        ts: now, session: sessionId, dimension,
        action: 'append', entries_added: entries.length,
        entries_updated: 0, source: 'precompact-extraction'
      });
    }

    meta.last_updated = now;
    saveMeta(meta);

  } catch (error) {
    process.stderr.write(`[learning-loop-precompact] ${error.message}\n`);
  }

  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
}

main();
