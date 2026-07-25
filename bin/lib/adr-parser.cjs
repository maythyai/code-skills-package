/**
 * ADR Parser — Parse Architecture Decision Records from markdown files.
 *
 * ADRs follow the format:
 *   # <Title>
 *   ## Status
 *   ## Context
 *   ## Decision
 *   ## Consequences
 *
 * Usage:
 *   const { parseADR, findADRs } = require('./adr-parser.cjs');
 *   const adr = parseADR('./docs/adr/001-use-react.md');
 *   const all = findADRs('./docs/adr');
 */
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Parse a single ADR markdown file into a structured object.
 * @param {string} filePath - Absolute or relative path to an ADR .md file
 * @returns {{ title: string, status: string, context: string, decision: string, consequences: string }}
 */
function parseADR(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const result = { title: '', status: '', context: '', decision: '', consequences: '' };

  // Extract title from first H1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Extract sections by ## headings
  const sectionMap = { status: 'status', context: 'context', decision: 'decision', consequences: 'consequences' };
  let currentSection = null;
  let buffer = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      // Flush previous section
      if (currentSection && sectionMap[currentSection]) {
        result[sectionMap[currentSection]] = buffer.join('\n').trim();
      }
      const heading = headingMatch[1].trim().toLowerCase();
      currentSection = Object.keys(sectionMap).find(k => heading.includes(k)) || null;
      buffer = [];
    } else if (currentSection) {
      buffer.push(line);
    }
  }
  // Flush last section
  if (currentSection && sectionMap[currentSection]) {
    result[sectionMap[currentSection]] = buffer.join('\n').trim();
  }

  return result;
}

/**
 * Find and parse all ADR files in a directory (non-recursive).
 * Looks for files matching patterns: *.md, NNN-*.md, adr-*.md
 * @param {string} dir - Directory to scan for ADR files
 * @returns {Array<{ file: string, title: string, status: string, context: string, decision: string, consequences: string }>}
 */
function findADRs(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f =>
    f.endsWith('.md') && (
      /^\d{3,4}[-_]/.test(f) ||
      /^adr[-_]/i.test(f) ||
      /decision/i.test(f)
    )
  );
  return files.sort().map(f => {
    const parsed = parseADR(path.join(dir, f));
    return { file: f, ...parsed };
  });
}

module.exports = { parseADR, findADRs };

// CLI entry point for standalone testing
if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.log('Usage: node adr-parser.cjs <file-or-directory>');
    process.exit(1);
  }
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    const adrs = findADRs(target);
    console.log(`Found ${adrs.length} ADR(s) in ${target}`);
    adrs.forEach(a => console.log(`  [${a.status || 'unknown'}] ${a.file}: ${a.title}`));
  } else {
    const adr = parseADR(target);
    console.log(JSON.stringify(adr, null, 2));
  }
}
