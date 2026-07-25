/**
 * Fallow Runner — Detect dead code paths after refactoring.
 *
 * Performs two lightweight static checks on a source directory:
 *   1. Unused exports: exported functions never imported/required elsewhere
 *   2. Unreachable code: statements appearing after return/throw in the same block
 *
 * Usage:
 *   const { runFallowChecks } = require('./fallow-runner.cjs');
 *   const result = runFallowChecks('./src', { extensions: ['.js', '.ts'] });
 *   // => { unused: [{ file, name }], unreachable: [{ file, line }] }
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_EXTENSIONS = ['.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx'];

/** Recursively collect source files matching given extensions. */
function collectFiles(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results.push(...collectFiles(full, extensions));
    } else if (extensions.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

/** Extract exported function names from file content. */
function extractExports(content) {
  const names = [];
  const patterns = [
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+const\s+(\w+)\s*=/g,
    /module\.exports\s*=\s*\{([^}]+)\}/g,
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(content)) !== null) {
      if (pat.source.includes('module.exports')) {
        m[1].split(',').forEach(n => { const t = n.trim().split(':')[0].trim(); if (t) names.push(t); });
      } else {
        names.push(m[1]);
      }
    }
  }
  return names;
}

/** Find unreachable code: lines after return/throw at same indentation level. */
function findUnreachable(content, fileName) {
  const results = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const indent = line.match(/^(\s*)/)[1].length;
    if (/^\s*(return\b|throw\b)/.test(line) && !line.trim().endsWith('//')) {
      // Check subsequent lines at same or deeper indent that are not blank/closing braces
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (next.trim() === '' || next.trim() === '}') break;
        const nextIndent = next.match(/^(\s*)/)[1].length;
        if (nextIndent <= indent && next.trim() !== '') {
          results.push({ file: fileName, line: j + 1 });
          break;
        }
      }
    }
  }
  return results;
}

/**
 * Run fallow (dead code) checks on a source directory.
 * @param {string} srcDir - Root directory to scan
 * @param {{ extensions?: string[] }} [options] - Optional configuration
 * @returns {{ unused: Array<{ file: string, name: string }>, unreachable: Array<{ file: string, line: number }> }}
 */
function runFallowChecks(srcDir, options = {}) {
  const extensions = options.extensions || DEFAULT_EXTENSIONS;
  const files = collectFiles(srcDir, extensions);
  const allContent = files.map(f => ({ file: f, content: fs.readFileSync(f, 'utf8') }));
  const combinedText = allContent.map(f => f.content).join('\n');

  // Check 1: unused exports
  const unused = [];
  for (const { file, content } of allContent) {
    for (const name of extractExports(content)) {
      if (name === 'default') continue;
      // Count references outside the defining file (simple heuristic)
      const importPattern = new RegExp(`\\b${name}\\b`, 'g');
      const otherRefs = allContent
        .filter(f => f.file !== file)
        .some(f => importPattern.test(f.content));
      if (!otherRefs) unused.push({ file: path.relative(srcDir, file), name });
    }
  }

  // Check 2: unreachable code
  const unreachable = [];
  for (const { file, content } of allContent) {
    unreachable.push(...findUnreachable(content, path.relative(srcDir, file)));
  }

  return { unused, unreachable };
}

module.exports = { runFallowChecks };

// CLI entry point for standalone testing
if (require.main === module) {
  const target = process.argv[2] || '.';
  console.log(`Scanning ${target} for dead code paths...`);
  const { unused, unreachable } = runFallowChecks(target);
  if (unused.length) {
    console.log(`\nUnused exports (${unused.length}):`);
    unused.forEach(u => console.log(`  ${u.file}: ${u.name}`));
  }
  if (unreachable.length) {
    console.log(`\nUnreachable code (${unreachable.length}):`);
    unreachable.forEach(u => console.log(`  ${u.file}:${u.line}`));
  }
  if (!unused.length && !unreachable.length) console.log('No dead code detected.');
}
