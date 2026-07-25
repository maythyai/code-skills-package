/**
 * UI Safety Gate — Validate that UI changes don't break accessibility basics.
 *
 * Performs regex-based checks on HTML/JSX file content for common
 * accessibility regressions:
 *   - Inline styles without corresponding aria-label
 *   - Removed alt attributes on images
 *   - tabindex values greater than 0
 *
 * Usage:
 *   const { checkUISafety } = require('./ui-safety-gate.cjs');
 *   const result = checkUISafety(['src/App.jsx', 'public/index.html']);
 *   // => { pass: boolean, warnings: string[] }
 */
'use strict';

const fs = require('fs');
const path = require('path');

const UI_EXTENSIONS = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte']);

/**
 * Check a single file's content for UI safety issues.
 * @param {string} content - File content to check
 * @param {string} fileName - File name for reporting
 * @returns {string[]} Array of warning messages
 */
function checkContent(content, fileName) {
  const warnings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check: inline style without aria-label on same element
    if (/style\s*=\s*["'{]/.test(line) && !/aria-label/.test(line)) {
      // Only flag if it looks like an interactive or image element
      if (/<(img|button|a|input|div|span)\b/i.test(line)) {
        warnings.push(`${fileName}:${lineNum} — inline style without aria-label on element`);
      }
    }

    // Check: img tags missing alt attribute
    if (/<img\b/i.test(line) && !/alt\s*=/.test(line)) {
      // Allow multi-line: check next few lines for alt
      const snippet = lines.slice(i, Math.min(i + 3, lines.length)).join(' ');
      if (!/alt\s*=/.test(snippet)) {
        warnings.push(`${fileName}:${lineNum} — <img> missing alt attribute`);
      }
    }

    // Check: tabindex > 0
    const tabindexMatch = line.match(/tabindex\s*=\s*["'{]?(\d+)/i);
    if (tabindexMatch && parseInt(tabindexMatch[1], 10) > 0) {
      warnings.push(`${fileName}:${lineNum} — tabindex="${tabindexMatch[1]}" > 0 (use 0 or -1)`);
    }
  }

  return warnings;
}

/**
 * Validate UI safety across a list of changed files.
 * Non-UI files (by extension) are skipped.
 * @param {string[]} filesChanged - Array of file paths that were changed
 * @returns {{ pass: boolean, warnings: string[] }}
 */
function checkUISafety(filesChanged) {
  const warnings = [];

  for (const filePath of filesChanged) {
    const ext = path.extname(filePath).toLowerCase();
    if (!UI_EXTENSIONS.has(ext)) continue;
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    warnings.push(...checkContent(content, path.basename(filePath)));
  }

  return { pass: warnings.length === 0, warnings };
}

module.exports = { checkUISafety, checkContent };

// CLI entry point for standalone testing
if (require.main === module) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.log('Usage: node ui-safety-gate.cjs <file1> [file2] ...');
    process.exit(1);
  }
  const result = checkUISafety(files);
  if (result.pass) {
    console.log('PASS: No UI safety issues detected.');
  } else {
    console.log(`FAIL: ${result.warnings.length} warning(s):`);
    result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
    process.exit(1);
  }
}
