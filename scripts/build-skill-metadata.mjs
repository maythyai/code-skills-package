// scripts/build-skill-metadata.mjs
// Extract v2 metadata from all SKILL.md files into a centralized YAML

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const V2_FIELDS = ['phase', 'domain', 'role', 'scope', 'model_rules', 'tools', 'dependencies', 'related_skills', 'anti_rationalizations'];
const LAYER_DIRS = ['csp-meta', 'csp-workflow', 'csp-patterns', 'csp-runtime', 'csp-router'];

function findSkills(baseDir) {
  const results = [];
  for (const layer of LAYER_DIRS) {
    const skillsDir = join(baseDir, layer, 'skills');
    if (!existsSync(skillsDir)) continue;
    scan(skillsDir, results);
  }
  return results;
}

function scan(dir, results) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const skillMd = join(full, 'SKILL.md');
    if (existsSync(skillMd)) results.push({ name: entry, path: skillMd });
    scan(full, results);
  }
}

function extractV2(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  // Simple YAML frontmatter parsing
  const frontmatter = match[1];
  const lines = frontmatter.split('\n');
  const fm = {};

  for (const line of lines) {
    if (line.trim() === '') continue;

    const keyValueMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;

      if (value.trim() !== '') {
        // Parse the value (simple approach for strings, arrays, booleans, numbers)
        let parsedValue = value.trim();

        if (parsedValue.startsWith('"') && parsedValue.endsWith('"')) {
          parsedValue = parsedValue.substring(1, parsedValue.length - 1);
        } else if (parsedValue.startsWith("'") && parsedValue.endsWith("'")) {
          parsedValue = parsedValue.substring(1, parsedValue.length - 1);
        } else if (parsedValue === 'true') {
          parsedValue = true;
        } else if (parsedValue === 'false') {
          parsedValue = false;
        } else if (!isNaN(parsedValue) && parsedValue.trim() !== '') {
          parsedValue = Number(parsedValue);
        } else if (parsedValue.startsWith('[') && parsedValue.endsWith(']')) {
          // Parse array
          parsedValue = parsedValue.substring(1, parsedValue.length - 1)
            .split(',')
            .map(item => item.trim().replace(/(^["']|["']$)/g, ''));
        }

        fm[key] = parsedValue;
      }
    } else {
      // Handle array items and nested structures
      const arrayItemMatch = line.match(/^\s*-\s*(.*)/);
      if (arrayItemMatch) {
        // This is an array item, but we need to know which array it belongs to
        // For simplicity, we'll handle this in a basic way
      }
    }
  }

  const v2 = {};
  for (const field of V2_FIELDS) {
    if (fm[field] !== undefined) v2[field] = fm[field];
  }
  return Object.keys(v2).length > 0 ? v2 : null;
}

function serializeToYaml(obj, indentLevel = 0) {
  const indent = '  '.repeat(indentLevel);
  let result = '';

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    for (const item of obj) {
      if (typeof item === 'object') {
        result += `${indent}- \n${serializeToYaml(item, indentLevel + 1)}`;
      } else {
        result += `${indent}- ${typeof item === 'string' && item.includes(' ') ? `"${item}"` : String(item)}\n`;
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return '{}';
    }
    for (const [key, value] of entries) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'object') {
        result += `${indent}${key}:\n`;
        if (Array.isArray(value)) {
          if (value.length === 0) {
            result += `${indent}  ${key}: []\n`;
          } else {
            result += value.map(item =>
              typeof item === 'object'
                ? `${indent}  - ${serializeToYaml(item, indentLevel + 1).trim()}\n`
                : `${indent}  - ${typeof item === 'string' && item.includes(' ') ? `"${item}"` : String(item)}\n`
            ).join('');
          }
        } else {
          result += serializeToYaml(value, indentLevel + 1);
        }
      } else {
        const formattedValue = typeof value === 'string'
          ? (value.includes(' ') || value.includes('#') ? `"${value}"` : value)
          : String(value);
        result += `${indent}${key}: ${formattedValue}\n`;
      }
    }
  } else {
    const formattedValue = typeof obj === 'string'
      ? (obj.includes(' ') || obj.includes('#') ? `"${obj}"` : obj)
      : String(obj);
    return `${indent}${formattedValue}\n`;
  }

  return result;
}

function main() {
  const baseDir = resolve(process.argv[2] || '.');
  const skills = findSkills(baseDir);
  const metadata = {
    version: '2.0',
    generated_at: new Date().toISOString(),
    skills: {}
  };

  let v2Count = 0;
  for (const skill of skills) {
    const v2 = extractV2(skill.path);
    if (v2) {
      metadata.skills[skill.name] = v2;
      v2Count++;
    }
  }

  const output = serializeToYaml(metadata);
  const outPath = join(baseDir, 'csp-router', 'skill-metadata.yaml');
  writeFileSync(outPath, `# csp-router/skill-metadata.yaml\n# Auto-generated from SKILL.md v2 frontmatter\n# Used by confidence-router for fast metadata lookup\n# Regenerate: node scripts/build-skill-metadata.mjs\n\n${output}`);
  console.log(`Generated ${outPath}: ${v2Count} v2 skills out of ${skills.length} total`);
}

main();