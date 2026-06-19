// scripts/validate-skill-v2.mjs
// Validate SKILL.md files against v2 spec

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const VALID_PHASES = ['define', 'plan', 'build', 'verify', 'review', 'ship'];
const VALID_DOMAINS = ['language', 'quality', 'security', 'architecture', 'devops', 'database', 'testing', 'api', 'patterns', 'other'];
const VALID_ROLES = ['specialist', 'expert', 'architect', 'reviewer', 'guardian', 'wizard'];
const VALID_SCOPES = ['implementation', 'review', 'analysis', 'design', 'testing'];
const VALID_MODELS = ['opus', 'sonnet', 'haiku'];
const VALID_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Agent', 'NotebookEdit'];

// Simple YAML parser for frontmatter (avoids needing external 'yaml' package)
function parseSimpleYaml(text) {
  const result = {};
  const lines = text.split('\n');
  let currentKey = null;
  let currentObj = null;
  let currentArray = null;
  let inMultiline = false;
  let multilineKey = null;
  let multilineValue = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    // Check for multiline string continuation
    if (inMultiline) {
      if (line.startsWith('  ') || line.startsWith('    ')) {
        multilineValue.push(line.trim());
        continue;
      } else {
        // End of multiline
        result[multilineKey] = multilineValue.join('\n');
        inMultiline = false;
        multilineKey = null;
        multilineValue = [];
      }
    }

    // Check for key: value pair
    const match = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
    if (!match) continue;

    const indent = match[1].length;
    const key = match[2];
    let value = match[3].trim();

    // Handle array items
    if (value.startsWith('- ')) {
      if (!currentArray) {
        currentArray = [];
        result[currentKey] = currentArray;
      }
      currentArray.push(value.substring(2).trim().replace(/^["']|["']$/g, ''));
      continue;
    }

    // If we have a value
    if (value) {
      // Remove quotes
      value = value.replace(/^["']|["']$/g, '');

      // Check for inline object (key: value pairs on same level)
      if (indent > 0 && currentObj !== null) {
        currentObj[key] = value;
        continue;
      }

      result[key] = value;
      currentKey = key;
      currentArray = null;
      currentObj = null;
    } else if (indent > 0 && currentKey) {
      // Nested object
      if (!currentObj) {
        currentObj = {};
        result[currentKey] = currentObj;
      }
      currentObj[key] = value;
    } else {
      currentKey = key;
      currentArray = null;
      currentObj = null;
    }
  }

  // Handle any remaining multiline
  if (inMultiline && multilineKey) {
    result[multilineKey] = multilineValue.join('\n');
  }

  return result;
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return parseSimpleYaml(match[1]);
  } catch (e) {
    console.error(`Warning: Failed to parse frontmatter: ${e.message}`);
    return null;
  }
}

function validateSkill(fm, filePath) {
  const errors = [];
  const warnings = [];

  // Required
  if (!fm.name) errors.push('Missing required field: name');
  if (!fm.description) errors.push('Missing required field: description');

  // V2 optional fields (validate if present)
  if (fm.phase && !VALID_PHASES.includes(fm.phase)) {
    errors.push(`Invalid phase: ${fm.phase} (valid: ${VALID_PHASES.join(', ')})`);
  }
  if (fm.domain && !VALID_DOMAINS.includes(fm.domain)) {
    errors.push(`Invalid domain: ${fm.domain} (valid: ${VALID_DOMAINS.join(', ')})`);
  }
  if (fm.role && !VALID_ROLES.includes(fm.role)) {
    errors.push(`Invalid role: ${fm.role} (valid: ${VALID_ROLES.join(', ')})`);
  }
  if (fm.scope && !VALID_SCOPES.includes(fm.scope)) {
    errors.push(`Invalid scope: ${fm.scope} (valid: ${VALID_SCOPES.join(', ')})`);
  }
  if (fm.model && !VALID_MODELS.includes(fm.model)) {
    errors.push(`Invalid model: ${fm.model} (valid: ${VALID_MODELS.join(', ')})`);
  }
  if (fm.tools) {
    if (!Array.isArray(fm.tools)) {
      errors.push('tools must be an array');
    } else {
      for (const tool of fm.tools) {
        if (!VALID_TOOLS.includes(tool)) {
          errors.push(`Invalid tool: ${tool} (valid: ${VALID_TOOLS.join(', ')})`);
        }
      }
    }
  }
  if (fm.anti_rationalizations && typeof fm.anti_rationalizations !== 'object') {
    errors.push('anti_rationalizations must be an object (key: value pairs)');
  }

  // V2 coverage check
  if (!fm.phase) warnings.push('Missing v2 field: phase');
  if (!fm.domain) warnings.push('Missing v2 field: domain');
  if (!fm.role) warnings.push('Missing v2 field: role');

  return { errors, warnings, isV2: !!(fm.phase || fm.domain || fm.role) };
}

function findSkills(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      const skillMd = join(full, 'SKILL.md');
      if (existsSync(skillMd)) results.push(skillMd);
      results.push(...findSkills(full));
    }
  }
  return results;
}

function main() {
  const target = process.argv[2] || '.';
  const root = resolve(target);

  let skillFiles;
  if (statSync(root).isFile()) {
    skillFiles = [root];
  } else {
    skillFiles = findSkills(root);
  }

  let pass = 0, fail = 0, v2Count = 0;

  for (const file of skillFiles) {
    try {
      const content = readFileSync(file, 'utf8');
      const fm = extractFrontmatter(content);
      if (!fm) {
        console.log(`⚠️  ${file}: No frontmatter found`);
        fail++;
        continue;
      }

      const result = validateSkill(fm, file);

      if (result.errors.length > 0) {
        console.log(`❌ ${file}`);
        result.errors.forEach(e => console.log(`   ERROR: ${e}`));
        fail++;
      } else {
        if (result.isV2) v2Count++;
        if (result.warnings.length > 0 && process.argv.includes('--verbose')) {
          console.log(`⚠️  ${file} (${result.isV2 ? 'v2' : 'v1'})`);
          result.warnings.forEach(w => console.log(`   WARN: ${w}`));
        }
        pass++;
      }
    } catch (e) {
      console.log(`❌ ${file}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total: ${skillFiles.length} | Pass: ${pass} | Fail: ${fail} | V2: ${v2Count}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
