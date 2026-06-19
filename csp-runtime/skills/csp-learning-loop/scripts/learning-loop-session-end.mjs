#!/usr/bin/env node
/**
 * learning-loop-session-end.mjs — SessionEnd hook for csp-learning-loop
 *
 * Final flush of all pending signals at session close.
 * Most comprehensive extraction — runs after all other session-end hooks.
 *
 * Contract:
 * - Reads JSON from stdin (transcript_path, session metadata)
 * - Always exits 0 (never blocks)
 * - Always outputs JSON to stdout
 * - Longer timeout allowed (20s) since session is ending
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
 * Session-end comprehensive extraction.
 * Scans full transcript for all 5 dimensions.
 */
function extractSessionEndSignals(transcript) {
  const signals = {
    'project-core': [],
    'user-needs': [],
    'developer-profile': [],
    'long-term-memory': [],
    'skill-feedback': []
  };

  if (!transcript || transcript.length < 200) return signals;

  // --- Project Core ---
  // Detect file patterns and project structure
  const filePatterns = transcript.match(/(?:\.ts|\.js|\.py|\.go|\.rs|\.java|\.md|\.json|\.yaml)\b/gi);
  if (filePatterns && filePatterns.length > 5) {
    const unique = [...new Set(filePatterns.map(f => f.toLowerCase()))];
    signals['project-core'].push({
      content: `File types in use: ${unique.slice(0, 10).join(', ')}`,
      confidence: 0.9,
      source: 'session-end-extraction'
    });
  }

  // --- User Needs ---
  // Detect workflow patterns
  const taskKeywords = {
    'code review': /(?:code review|审查|review)/gi,
    'debugging': /(?:debug|调试|fix|修复|troubleshoot)/gi,
    'planning': /(?:plan|规划|design|设计|architecture)/gi,
    'testing': /(?:test|测试|spec|assert)/gi,
    'documentation': /(?:doc|文档|readme|changelog)/gi
  };

  for (const [task, pattern] of Object.entries(taskKeywords)) {
    const matches = transcript.match(pattern);
    if (matches && matches.length >= 2) {
      signals['user-needs'].push({
        content: `Performed ${task} (${matches.length} occurrences)`,
        confidence: 0.75,
        source: 'session-end-extraction',
        explicit: false,
        frequency: matches.length
      });
    }
  }

  // --- Developer Profile ---
  // Language detection
  const chineseChars = (transcript.match(/[一-鿿]/g) || []).length;
  const totalChars = transcript.length;
  const chineseRatio = chineseChars / totalChars;

  if (chineseRatio > 0.1) {
    signals['developer-profile'].push({
      content: `Primary communication language: Chinese (ratio: ${(chineseRatio * 100).toFixed(0)}%)`,
      confidence: 0.9,
      source: 'session-end-extraction',
      evidence_count: chineseChars
    });
  }

  // Session activity pattern
  const toolCalls = (transcript.match(/(?:ToolUse|tool_call|function_call)/g) || []).length;
  if (toolCalls > 0) {
    signals['developer-profile'].push({
      content: `Session activity: ${toolCalls} tool invocations`,
      confidence: 0.8,
      source: 'session-end-extraction',
      evidence_count: 1
    });
  }

  // --- Long-term Memory ---
  // Extract key decisions and solutions
  const solutionPatterns = [
    /(?:solution|fix|resolved|solved|解决方案)[:\s]+([^\n]{15,200})/gi,
    /(?:decided|decision|chose|决定)[:\s]+([^\n]{15,200})/gi
  ];

  for (const pattern of solutionPatterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null && signals['long-term-memory'].length < 5) {
      // Quality gate: skip if too generic
      const text = match[1].trim();
      if (text.length < 20) continue;
      if (/^(yes|no|ok|sure|maybe)$/i.test(text)) continue;

      signals['long-term-memory'].push({
        content: text.substring(0, 200),
        confidence: 0.7,
        source: 'session-end-extraction',
        context: 'Extracted from session transcript'
      });
    }
  }

  // --- Skill Feedback ---
  // Detect skill-related frustration or satisfaction
  const skillFrustration = transcript.match(
    /(?:skill|技能|csp-)(?:.*?)(?:not working|doesn't work|broken|doesn't handle|不对|有问题)/gi
  );
  if (skillFrustration) {
    for (const match of skillFrustration.slice(0, 3)) {
      signals['skill-feedback'].push({
        content: match.trim().substring(0, 200),
        confidence: 0.7,
        source: 'session-end-extraction',
        gap_type: 'negative',
        severity: 'medium'
      });
    }
  }

  const skillPraise = transcript.match(
    /(?:skill|技能|csp-)(?:.*?)(?:great|perfect|awesome|很好|太棒了|完美)/gi
  );
  if (skillPraise) {
    for (const match of skillPraise.slice(0, 3)) {
      signals['skill-feedback'].push({
        content: match.trim().substring(0, 200),
        confidence: 0.7,
        source: 'session-end-extraction',
        gap_type: 'positive',
        severity: 'low'
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

  const input = await readStdin(2000);
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
        // Session end can read more of the transcript
        transcript = readFileSync(transcriptPath, 'utf8').slice(-100000);
      } catch {}
    }

    if (!existsSync(INTEL_DIR)) {
      mkdirSync(INTEL_DIR, { recursive: true });
    }

    const meta = loadMeta();
    const signals = extractSessionEndSignals(transcript);
    const now = new Date().toISOString();
    const date = now.split('T')[0];
    let totalAdded = 0;

    for (const [dimension, entries] of Object.entries(signals)) {
      if (entries.length === 0) continue;

      const dimFile = join(INTEL_DIR, `${dimension}.md`);
      let content = '';
      if (existsSync(dimFile)) {
        content = readFileSync(dimFile, 'utf8');
      }

      // Check token budget — skip if dimension is getting large
      if (content.length > 8000) continue; // ~2000 tokens

      const newLines = entries.map(e => {
        const extras = [];
        if (e.frequency) extras.push(`frequency: ${e.frequency}`);
        if (e.evidence_count) extras.push(`evidence_count: ${e.evidence_count}`);
        if (e.gap_type) extras.push(`gap_type: ${e.gap_type}`);
        if (e.severity) extras.push(`severity: ${e.severity}`);
        const extraStr = extras.length > 0 ? ' | ' + extras.join(', ') : '';
        return `- [${date}] ${e.content} | confidence: ${e.confidence} | source: ${e.source}${extraStr}`;
      }).join('\n');

      // Remove placeholder
      content = content.replace('_Nothing captured yet. Will populate as sessions accumulate._\n', '');

      // Find appropriate section to append to
      const sectionMap = {
        'project-core': '## Key Patterns',
        'user-needs': '## Recurring Tasks',
        'developer-profile': '## Working Habits',
        'long-term-memory': '## Lessons Learned',
        'skill-feedback': '## Positive Signals'
      };

      const targetSection = sectionMap[dimension] || '## Captured';
      const sectionRegex = new RegExp(`(${targetSection.replace('#', '\\#')}[^\\n]*\\n)`);
      const sectionMatch = content.match(sectionRegex);

      if (sectionMatch) {
        const insertPos = content.indexOf(sectionMatch[0]) + sectionMatch[0].length;
        content = content.slice(0, insertPos) + newLines + '\n' + content.slice(insertPos);
      } else {
        // Append to end
        content += `\n${targetSection}\n${newLines}\n`;
      }

      // Update frontmatter
      content = content.replace(/updated_at: "[^"]*"/, `updated_at: "${now}"`);
      content = content.replace(/session_id: "[^"]*"/, `session_id: "${sessionId}"`);

      // Atomic write
      const tmp = dimFile + '.tmp';
      writeFileSync(tmp, content);
      renameSync(tmp, dimFile);

      meta.dimensions[dimension] = meta.dimensions[dimension] || { entries: 0, last_touched: '' };
      meta.dimensions[dimension].entries += entries.length;
      meta.dimensions[dimension].last_touched = now;
      totalAdded += entries.length;

      appendChangelog({
        ts: now, session: sessionId, dimension,
        action: 'append', entries_added: entries.length,
        entries_updated: 0, source: 'session-end-extraction'
      });
    }

    // Final meta update
    meta.last_updated = now;
    meta.session_count += 1;
    saveMeta(meta);

    // Output summary (visible in hook logs)
    if (totalAdded > 0) {
      process.stderr.write(`[learning-loop] Session end: extracted ${totalAdded} signals across ${Object.values(signals).filter(s => s.length > 0).length} dimensions\n`);
    }

  } catch (error) {
    process.stderr.write(`[learning-loop-session-end] ${error.message}\n`);
  }

  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
}

main();
