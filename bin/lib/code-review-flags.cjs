/**
 * Code Review Flags — Detect code review red flags in diff/patch content.
 *
 * Scans unified diff text for common issues that should be caught in review:
 *   - TODO/FIXME/HACK comments
 *   - console.log statements left in
 *   - debugger statements
 *   - Commented-out code blocks (>3 consecutive lines)
 *   - Hardcoded secrets patterns (api_key=, password=, token=)
 *
 * Usage:
 *   const { detectFlags } = require('./code-review-flags.cjs');
 *   const result = detectFlags(diffText);
 *   // => { flags: [{ severity: 'high'|'medium'|'low', line: number, message: string }] }
 */
'use strict';

/**
 * Detect code review red flags in unified diff text.
 * Only inspects added lines (lines starting with '+' but not '+++').
 * @param {string} diffText - Unified diff content
 * @returns {{ flags: Array<{ severity: string, line: number, message: string }> }}
 */
function detectFlags(diffText) {
  const flags = [];
  const lines = diffText.split('\n');
  let currentLine = 0;
  let commentBlock = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // Track line numbers from @@ hunks
    const hunkMatch = raw.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1], 10) - 1;
      commentBlock = [];
      continue;
    }

    // Only inspect added lines
    if (!raw.startsWith('+') || raw.startsWith('+++')) {
      // Flush comment block if broken
      flushCommentBlock(commentBlock, flags);
      commentBlock = [];
      if (!raw.startsWith('-')) currentLine++;
      continue;
    }

    currentLine++;
    const line = raw.slice(1); // strip leading '+'
    const trimmed = line.trim();

    // TODO/FIXME/HACK comments
    const todoMatch = trimmed.match(/\b(TODO|FIXME|HACK)\b/i);
    if (todoMatch) {
      flags.push({ severity: 'low', line: currentLine, message: `${todoMatch[1].toUpperCase()} comment found` });
    }

    // console.log left in
    if (/\bconsole\.(log|debug|info)\s*\(/.test(trimmed)) {
      flags.push({ severity: 'medium', line: currentLine, message: 'console.log/debug statement left in code' });
    }

    // debugger statement
    if (/^\s*debugger\s*;?\s*$/.test(line)) {
      flags.push({ severity: 'high', line: currentLine, message: 'debugger statement left in code' });
    }

    // Hardcoded secrets
    if (/(api_key|apikey|password|passwd|secret|token)\s*[:=]\s*['"][^'"]{4,}/i.test(trimmed)) {
      flags.push({ severity: 'high', line: currentLine, message: 'Possible hardcoded secret detected' });
    }

    // Commented-out code tracking (lines that are comments with code-like content)
    if (/^\s*(\/\/|#|\/\*)/.test(line) && /[;{}()=]/.test(trimmed) && !todoMatch) {
      commentBlock.push(currentLine);
    } else {
      flushCommentBlock(commentBlock, flags);
      commentBlock = [];
    }
  }
  flushCommentBlock(commentBlock, flags);

  return { flags };
}

/** Flush a comment block if it exceeds 3 consecutive lines. */
function flushCommentBlock(block, flags) {
  if (block.length > 3) {
    flags.push({
      severity: 'medium',
      line: block[0],
      message: `Commented-out code block (${block.length} lines starting here)`
    });
  }
}

module.exports = { detectFlags };

// CLI entry point for standalone testing
if (require.main === module) {
  const fs = require('fs');
  const input = process.argv[2];
  if (!input) {
    console.log('Usage: node code-review-flags.cjs <diff-file>');
    console.log('   or: git diff | node code-review-flags.cjs -');
    process.exit(1);
  }
  const diffText = input === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(input, 'utf8');
  const { flags } = detectFlags(diffText);
  if (flags.length === 0) {
    console.log('No red flags detected.');
  } else {
    console.log(`${flags.length} flag(s) found:`);
    flags.forEach(f => console.log(`  [${f.severity.toUpperCase()}] line ${f.line}: ${f.message}`));
    process.exit(1);
  }
}
