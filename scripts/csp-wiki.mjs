#!/usr/bin/env node
/**
 * csp-wiki — L4 Wiki operations for CSP knowledge base.
 * Zero external dependencies. Node.js >= 18 ESM.
 *
 * Usage: node scripts/csp-wiki.mjs <command> [args]
 *
 * Commands:
 *   ingest <file-or-text>   — Add knowledge to .csp/wiki/
 *   query <keywords>        — Search wiki by keyword + tags (NO vector embeddings)
 *   lint                    — Check wiki health (broken links, orphans, stale entries)
 *   list                    — List all wiki entries with categories
 *   index                   — Rebuild index.md from all wiki entries
 *
 * Storage:
 *   .csp/wiki/*.md          — Wiki pages (markdown + YAML frontmatter)
 *   .csp/wiki/index.md      — Auto-maintained catalog
 *   .csp/wiki/log.md        — Append-only operation log
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, basename } from 'node:path';

// --- Config ---

const PROJECT_ROOT = process.env.CSP_PROJECT_ROOT || process.cwd();
const WIKI_DIR = join(PROJECT_ROOT, '.csp', 'wiki');
const INDEX_FILE = join(WIKI_DIR, 'index.md');
const LOG_FILE = join(WIKI_DIR, 'log.md');
const STALE_DAYS = 90;

// --- Utilities ---

function out(data) {
  if (typeof data === 'string') process.stdout.write(data + '\n');
  else process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

function err(msg) {
  process.stderr.write(`csp-wiki: ${msg}\n`);
}

function ensureWikiDir() {
  mkdirSync(WIKI_DIR, { recursive: true });
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function timestamp() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function logOp(operation, detail) {
  ensureWikiDir();
  const entry = `- [${timestamp()}] ${operation}: ${detail}\n`;
  try {
    appendFileSync(LOG_FILE, entry);
  } catch { /* non-critical */ }
}

// --- Frontmatter Parsing ---

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Parse arrays: [tag1, tag2]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(t => t.trim().replace(/^["']|["']$/g, ''));
    }
    meta[key] = value;
  }
  return { meta, body: match[2] };
}

function buildFrontmatter(meta) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(meta)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.join(', ')}]`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

// --- Wiki File Discovery ---

function getWikiFiles() {
  ensureWikiDir();
  try {
    return readdirSync(WIKI_DIR)
      .filter(f => f.endsWith('.md') && f !== 'index.md' && f !== 'log.md')
      .map(f => ({ file: f, path: join(WIKI_DIR, f), slug: f.replace(/\.md$/, '') }));
  } catch { return []; }
}

function readWikiPage(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const { meta, body } = parseFrontmatter(content);
    return { meta, body, content };
  } catch { return null; }
}

// --- Commands ---

function cmdIngest(args) {
  ensureWikiDir();
  const input = args.join(' ');
  if (!input) {
    err('Usage: csp-wiki ingest <file-path-or-text>');
    process.exit(1);
  }

  let title, content, tags = [], category = 'general';

  // Check if input is a file path
  const inputPath = join(PROJECT_ROOT, input);
  if (existsSync(inputPath) && statSync(inputPath).isFile()) {
    const raw = readFileSync(inputPath, 'utf-8');
    const parsed = parseFrontmatter(raw);
    title = parsed.meta.title || basename(inputPath, '.md').replace(/[-_]/g, ' ');
    content = parsed.body || raw;
    tags = Array.isArray(parsed.meta.tags) ? parsed.meta.tags : (parsed.meta.tags ? [parsed.meta.tags] : []);
    category = parsed.meta.category || 'general';
  } else {
    // Treat input as text content; first line or first 60 chars as title
    const lines = input.split('\n');
    title = lines[0].slice(0, 80);
    content = input;
    // Try to extract #tags from content
    const tagMatches = input.match(/#([a-z0-9-]+)/gi);
    if (tagMatches) {
      tags = [...new Set(tagMatches.map(t => t.slice(1).toLowerCase()))];
    }
  }

  const slug = slugify(title) || `entry-${Date.now()}`;
  const filePath = join(WIKI_DIR, `${slug}.md`);

  const meta = {
    title,
    tags,
    category,
    created: existsSync(filePath) ? (readWikiPage(filePath)?.meta?.created || today()) : today(),
    updated: today(),
  };

  const pageContent = buildFrontmatter(meta) + '\n\n' + content.trim() + '\n';
  writeFileSync(filePath, pageContent);

  // Update index
  rebuildIndex();
  logOp('ingest', slug);

  out({ status: 'ok', action: 'ingest', slug, file: `.csp/wiki/${slug}.md`, title, tags, category });
}

function cmdQuery(args) {
  const query = args.join(' ').toLowerCase();
  if (!query) {
    err('Usage: csp-wiki query <keywords>');
    process.exit(1);
  }

  const keywords = query.split(/\s+/).filter(Boolean);
  const files = getWikiFiles();
  const results = [];

  for (const { file, path, slug } of files) {
    const page = readWikiPage(path);
    if (!page) continue;

    const title = (page.meta.title || slug).toLowerCase();
    const tags = Array.isArray(page.meta.tags) ? page.meta.tags.map(t => t.toLowerCase()) : [];
    const body = page.body.toLowerCase();
    const category = (page.meta.category || '').toLowerCase();

    // Score: title match = 3, tag match = 2, category match = 1, body match = 1
    let score = 0;
    const matchedKeywords = [];

    for (const kw of keywords) {
      if (title.includes(kw)) { score += 3; matchedKeywords.push(kw); }
      if (tags.some(t => t.includes(kw))) { score += 2; matchedKeywords.push(kw); }
      if (category.includes(kw)) { score += 1; }
      if (body.includes(kw)) { score += 1; matchedKeywords.push(kw); }
    }

    if (score > 0) {
      // Extract snippet: first line containing a keyword
      const lines = page.body.split('\n');
      let snippet = '';
      for (const line of lines) {
        if (keywords.some(kw => line.toLowerCase().includes(kw)) && line.trim()) {
          snippet = line.trim().slice(0, 150);
          break;
        }
      }
      if (!snippet && lines.length > 0) snippet = lines.find(l => l.trim())?.trim().slice(0, 150) || '';

      results.push({
        slug,
        file: `.csp/wiki/${file}`,
        title: page.meta.title || slug,
        tags: page.meta.tags || [],
        category: page.meta.category || 'general',
        score,
        snippet,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  logOp('query', query);
  out({ query, results, total: results.length });
}

function cmdLint() {
  const files = getWikiFiles();
  const issues = [];
  const allSlugs = new Set(files.map(f => f.slug));
  const now = Date.now();

  for (const { file, path, slug } of files) {
    const page = readWikiPage(path);
    if (!page) {
      issues.push({ file, type: 'unreadable', message: 'Could not parse file' });
      continue;
    }

    // Check: missing tags
    if (!page.meta.tags || (Array.isArray(page.meta.tags) && page.meta.tags.length === 0)) {
      issues.push({ file, type: 'no-tags', message: 'Entry has no tags' });
    }

    // Check: missing title
    if (!page.meta.title) {
      issues.push({ file, type: 'no-title', message: 'Entry has no title in frontmatter' });
    }

    // Check: stale entries (older than STALE_DAYS)
    const updated = page.meta.updated || page.meta.created;
    if (updated) {
      const updatedTime = new Date(updated).getTime();
      const ageDays = (now - updatedTime) / (1000 * 60 * 60 * 24);
      if (ageDays > STALE_DAYS) {
        issues.push({ file, type: 'stale', message: `Last updated ${Math.round(ageDays)} days ago (>${STALE_DAYS}d)` });
      }
    }

    // Check: broken [[wiki-links]]
    const wikiLinks = page.body.match(/\[\[([^\]]+)\]\]/g) || [];
    for (const link of wikiLinks) {
      const target = link.slice(2, -2).trim();
      const targetSlug = slugify(target);
      if (!allSlugs.has(targetSlug) && !allSlugs.has(target)) {
        issues.push({ file, type: 'broken-link', message: `Broken wiki-link: [[${target}]]` });
      }
    }
  }

  // Check: orphan pages (no other page links to them)
  const linkedSlugs = new Set();
  for (const { path } of files) {
    const page = readWikiPage(path);
    if (!page) continue;
    const wikiLinks = page.body.match(/\[\[([^\]]+)\]\]/g) || [];
    for (const link of wikiLinks) {
      const target = link.slice(2, -2).trim();
      linkedSlugs.add(slugify(target));
      linkedSlugs.add(target);
    }
  }
  for (const { file, slug } of files) {
    if (!linkedSlugs.has(slug) && files.length > 1) {
      issues.push({ file, type: 'orphan', message: 'No other page links to this entry' });
    }
  }

  const summary = {
    total_pages: files.length,
    total_issues: issues.length,
    by_type: {},
  };
  for (const issue of issues) {
    summary.by_type[issue.type] = (summary.by_type[issue.type] || 0) + 1;
  }

  logOp('lint', `${issues.length} issues found`);
  out({ healthy: issues.length === 0, summary, issues });
}

function cmdList() {
  const files = getWikiFiles();
  const entries = [];

  for (const { file, path, slug } of files) {
    const page = readWikiPage(path);
    if (!page) continue;
    entries.push({
      slug,
      file: `.csp/wiki/${file}`,
      title: page.meta.title || slug,
      category: page.meta.category || 'general',
      tags: page.meta.tags || [],
      created: page.meta.created || 'unknown',
      updated: page.meta.updated || 'unknown',
    });
  }

  // Sort by category then title
  entries.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return (a.title || '').localeCompare(b.title || '');
  });

  // Format as table for human readability
  const table = entries.map(e =>
    `| ${e.title.padEnd(30)} | ${e.category.padEnd(15)} | ${(Array.isArray(e.tags) ? e.tags.join(', ') : '').padEnd(25)} | ${e.updated} |`
  );

  logOp('list', `${entries.length} entries`);
  out({
    total: entries.length,
    entries,
    table: [
      '| Title                          | Category        | Tags                      | Updated    |',
      '|--------------------------------|-----------------|---------------------------|------------|',
      ...table,
    ].join('\n'),
  });
}

function cmdIndex() {
  rebuildIndex();
  logOp('index', 'rebuilt');
  out({ status: 'ok', action: 'index', file: '.csp/wiki/index.md' });
}

function rebuildIndex() {
  ensureWikiDir();
  const files = getWikiFiles();
  const categories = {};

  for (const { file, path, slug } of files) {
    const page = readWikiPage(path);
    if (!page) continue;
    const category = page.meta.category || 'general';
    if (!categories[category]) categories[category] = [];
    categories[category].push({
      slug,
      title: page.meta.title || slug,
      tags: page.meta.tags || [],
    });
  }

  const lines = [
    '---',
    'title: Wiki Index',
    `updated: ${today()}`,
    '---',
    '',
    '# Wiki Index',
    '',
    `> ${files.length} pages across ${Object.keys(categories).length} categories. Auto-generated — do not edit manually.`,
    '',
  ];

  for (const [category, pages] of Object.entries(categories).sort()) {
    lines.push(`## ${category}`, '');
    for (const page of pages.sort((a, b) => a.title.localeCompare(b.title))) {
      const tagStr = page.tags.length ? ` (${page.tags.join(', ')})` : '';
      lines.push(`- [[${page.slug}]] — ${page.title}${tagStr}`);
    }
    lines.push('');
  }

  writeFileSync(INDEX_FILE, lines.join('\n'));
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);

  if (!command || command === '--help' || command === '-h') {
    out(`csp-wiki — L4 Wiki knowledge base operations

Usage: node scripts/csp-wiki.mjs <command> [args]

Commands:
  ingest <file-or-text>   Add knowledge to .csp/wiki/ (file path or inline text)
  query <keywords>        Search wiki by keyword + tags (NO vector embeddings)
  lint                    Check wiki health (broken links, orphans, stale entries)
  list                    List all wiki entries with categories
  index                   Rebuild index.md from all wiki entries

Storage: .csp/wiki/*.md (markdown + YAML frontmatter)
Categories: architecture, decision, pattern, debugging, environment, session-log, general

Examples:
  node scripts/csp-wiki.mjs ingest docs/auth-notes.md
  node scripts/csp-wiki.mjs ingest "Auth uses JWT with 24h expiry #auth #security"
  node scripts/csp-wiki.mjs query authentication jwt
  node scripts/csp-wiki.mjs lint
  node scripts/csp-wiki.mjs list
  node scripts/csp-wiki.mjs index`);
    process.exit(0);
  }

  switch (command) {
    case 'ingest':
      cmdIngest(rest);
      break;
    case 'query':
      cmdQuery(rest);
      break;
    case 'lint':
      cmdLint();
      break;
    case 'list':
      cmdList();
      break;
    case 'index':
      cmdIndex();
      break;
    default:
      err(`Unknown command: ${command}. Use --help for usage.`);
      process.exit(1);
  }
}

main();
