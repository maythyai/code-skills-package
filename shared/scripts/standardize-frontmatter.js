#!/usr/bin/env node
// standardize-frontmatter.js — Standardize SKILL.md frontmatter
// Usage: node shared/scripts/standardize-frontmatter.js [--dry-run|--fix|--report]

const fs = require('fs');
const path = require('path');

const mode = process.argv[2] || '--dry-run';
const doFix = mode === '--fix';
const doReport = mode === '--report';

process.chdir(path.join(__dirname, '../..'));

// Load registry for name->layer mapping
const registry = JSON.parse(fs.readFileSync('csp-router/registry.json', 'utf8'));
const regByName = {};
for (const s of registry.skills) {
  if (s.path) regByName[s.name] = s;
}

const dirs = ['csp-meta', 'csp-workflow', 'csp-patterns', 'csp-runtime'];
const layerMap = {'csp-meta': 1, 'csp-workflow': 2, 'csp-patterns': 4, 'csp-runtime': 5};

const files = [];
for (const dir of dirs) {
  function walk(d) {
    for (const e of fs.readdirSync(d, {withFileTypes: true})) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (e.name === 'SKILL.md') files.push(full);
    }
  }
  walk(dir);
}

let fixed = 0, unchanged = 0, mismatches = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) continue;

  const fm = fmMatch[1];
  const fmEnd = content.indexOf('---', fmMatch[0].length);
  const rest = content.slice(fmEnd + 3);
  const dirName = path.basename(path.dirname(filePath));
  const topLevel = filePath.split('/')[0];
  const inferredLayer = layerMap[topLevel] || 0;

  let newFm = fm;
  let changed = false;

  // 1. csp-layer -> layer (extract number)
  if (/^csp-layer:/m.test(newFm)) {
    newFm = newFm.replace(/^csp-layer:\s*(.+)/gm, (match, val) => {
      const num = val.trim().match(/^(\d)/);
      const layer = num ? num[1] : inferredLayer;
      changed = true;
      return 'layer: ' + layer;
    });
  }

  // 2. level -> layer
  if (/^level:/m.test(newFm) && !/^layer:/m.test(newFm)) {
    newFm = newFm.replace(/^level:\s*(.+)/gm, (match, val) => {
      changed = true;
      return 'layer: ' + val.trim();
    });
  }

  // 3. Add missing layer
  if (!/^layer:/m.test(newFm) && !/^csp-layer:/m.test(newFm) && !/^level:/m.test(newFm)) {
    // Try to find layer from registry
    const regEntry = regByName[dirName];
    const layer = regEntry ? regEntry.layer : inferredLayer;
    if (layer > 0) {
      newFm += '\nlayer: ' + layer;
      changed = true;
    }
  }

  // 4. csp-source -> origin
  if (/^csp-source:/m.test(newFm)) {
    if (!/^origin:/m.test(newFm)) {
      newFm = newFm.replace(/^csp-source:/gm, 'origin:');
    } else {
      newFm = newFm.replace(/^csp-source:.*$/gm, '');
    }
    changed = true;
  }

  // 5. Add missing category
  if (!/^category:/m.test(newFm)) {
    const catMap = {1: 'meta', 2: 'workflow', 4: 'patterns', 5: 'runtime'};
    const layerLine = newFm.match(/^layer:\s*(\d+)/m);
    if (layerLine && catMap[layerLine[1]]) {
      newFm += '\ncategory: ' + catMap[layerLine[1]];
      changed = true;
    }
  }

  // 6. Add missing description
  if (!/^description:/m.test(newFm)) {
    newFm += '\ndescription: ' + dirName + ' skill';
    changed = true;
  }

  // Check name match with registry
  const nameLine = newFm.match(/^name:\s*(.+)/m);
  if (nameLine) {
    const fmName = nameLine[1].trim();
    const regEntry = regByName[fmName];
    if (!regEntry) {
      // Not in registry — not necessarily an error
    } else if (regEntry.path && regEntry.path !== filePath) {
      mismatches.push(filePath + ' — frontmatter name=' + fmName + ' but registry path=' + regEntry.path);
    }
  }

  if (changed) {
    fixed++;
    if (doFix) {
      fs.writeFileSync(filePath, '---\n' + newFm + '\n---' + rest);
    } else {
      console.log('NEEDS_FIX: ' + filePath);
    }
  } else {
    unchanged++;
  }
}

// Report
if (doReport || doFix) {
  console.log('=== Frontmatter Standardization Report ===');
  console.log('Total checked: ' + files.length);
  console.log('Fixed: ' + fixed);
  console.log('Already compliant: ' + unchanged);
  if (mismatches.length > 0) {
    console.log('Name/path mismatches: ' + mismatches.length);
    for (const m of mismatches) console.log('  ' + m);
  }

  // Post-fix verification sample
  if (doFix) {
    console.log('\n=== Sample Verification ===');
    const sample = files.slice(0, 4);
    for (const f of sample) {
      const c = fs.readFileSync(f, 'utf8');
      const m = c.match(/^---\n([\s\S]*?)\n---/);
      if (m) {
        const lines = m[1].split('\n').filter(l => /^(name|description|layer|category):/.test(l));
        console.log(f + ':');
        lines.forEach(l => console.log('  ' + l.trim()));
      }
    }
  }
} else {
  console.log('Needs fix: ' + fixed);
  console.log('Already compliant: ' + unchanged);
}
