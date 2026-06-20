#!/usr/bin/env node
// scripts/sync-version.js
// 以 package.json.version 为唯一数据源，同步到所有文件。
// 用法:
//   node scripts/sync-version.js              # 同步当前 package.json 版本
//   node scripts/sync-version.js 0.8.0        # 先更新版本再同步

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Files that contain the version ──────────────────────────────────
// 每个条目: path + match(正则) + replaceFn(生成替换文本) + extractFn(提取旧版本)
const TARGETS = [
  {
    path: 'CLAUDE.md',
    match: /^# CSP — Code Skills Package v[0-9]+\.[0-9]+\.[0-9]+/m,
    replace: (v) => `# CSP — Code Skills Package v${v}`,
    extract: (m) => m[0].match(/v[0-9.]+$/)[0].slice(1),
  },
  {
    path: 'install.sh',
    match: /^readonly VERSION="[0-9]+\.[0-9]+\.[0-9]+"/m,
    replace: (v) => `readonly VERSION="${v}"`,
    extract: (m) => m[0].match(/[0-9.]+/)[0],
  },
  {
    path: 'README.md',
    match: /\[!\[v[0-9]+\.[0-9]+\.[0-9]+\]\(https:\/\/img\.shields\.io\/badge\/version-[0-9]+\.[0-9]+\.[0-9]+-green\)\]/,
    replace: (v) => `[![v${v}](https://img.shields.io/badge/version-${v}-green)](./CHANGELOG.md)`,
    extract: (m) => m[0].match(/v[0-9.]+/)[0].slice(1),
  },
  {
    path: 'README_zh.md',
    match: /\[!\[v[0-9]+\.[0-9]+\.[0-9]+\]\(https:\/\/img\.shields\.io\/badge\/version-[0-9]+\.[0-9]+\.[0-9]+-green\)\]/,
    replace: (v) => `[![v${v}](https://img.shields.io/badge/version-${v}-green)](./CHANGELOG.md)`,
    extract: (m) => m[0].match(/v[0-9.]+/)[0].slice(1),
  },
];

// ── Main ─────────────────────────────────────────────────────────────

function bump(newVersion) {
  const pkgPath = resolve(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  if (newVersion) {
    pkg.version = newVersion;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  const version = pkg.version;
  console.log(`\n  CSP v${version} — 同步版本号\n`);

  for (const target of TARGETS) {
    const filePath = resolve(ROOT, target.path);
    let content;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      console.log(`  ⚠️  跳过: ${target.path} (文件不存在)`);
      continue;
    }

    const m = content.match(target.match);
    if (!m) {
      console.log(`  ❌ 未匹配: ${target.path}`);
      continue;
    }

    // Check if already at target version
    const oldVersion = target.extract ? target.extract(m) : null;
    if (oldVersion === version) {
      console.log(`  ⏭️  ${target.path} (已是 v${version})`);
      continue;
    }

    const newContent = content.replace(target.match, target.replace(version));
    writeFileSync(filePath, newContent, 'utf8');
    console.log(`  ✅ ${target.path} (v${oldVersion} → v${version})`);
  }

  console.log(`\n  版本号已同步到 ${TARGETS.length} 个文件。\n`);
}

// CLI: node scripts/sync-version.js [version]
const newVersion = process.argv[2] || null;
bump(newVersion);
