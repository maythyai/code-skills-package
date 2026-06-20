#!/usr/bin/env node
// build-graph.mjs — Generate graph.json from registry.json (single source of truth)
// Usage: node shared/scripts/build-graph.mjs
//
// Data flow:
//   registry.json  (skills)  ─┐
//   triggers.yaml  (keywords) ├─► graph.json
//   skill-metadata.yaml        ┘
//
// graph.json is DERIVED — never edit manually.

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const ROOT = process.cwd();

const REGISTRY_PATH = 'csp-router/registry.json';
const TRIGGERS_PATH = 'csp-router/triggers.yaml';
const METADATA_PATH = 'csp-router/skill-metadata.yaml';
const GRAPH_OUTPUT = 'csp-router/skpg/graph.json';
const GRAPH_OUTPUT_DOT_CSP = '.csp/skpg/graph.json';

// ─── ID generation ───────────────────────────────────────────────────
function makeId(name) {
  return createHash('md5').update(name).digest('hex').slice(0, 12);
}

// ─── YAML: parse triggers.yaml ───────────────────────────────────────
// Extracts trigger_index: { keyword: { skills: [...], weight: N }, ... }

function parseTriggersYaml(text) {
  const triggerIndex = {};
  const lines = text.split('\n');
  let inTriggerIndex = false;
  let currentTrigger = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Enter trigger_index section
    if (trimmed === 'trigger_index:') {
      inTriggerIndex = true;
      continue;
    }

    // Leave trigger_index at next top-level key
    if (inTriggerIndex && line.search(/\S/) === 0 && trimmed.endsWith(':') && trimmed !== 'trigger_index:') {
      break;
    }

    if (!inTriggerIndex) continue;

    // Trigger key: "keyword": or 'keyword': or keyword:
    const triggerMatch = trimmed.match(/^(?:"([^"]+)"|'([^']+)'|([\w一-鿿]+)):\s*$/);
    if (triggerMatch) {
      currentTrigger = triggerMatch[1] || triggerMatch[2] || triggerMatch[3];
      triggerIndex[currentTrigger] = { skills: [], weight: 40 };
      continue;
    }

    // skills: [a, b, c]
    if (trimmed.startsWith('skills:') && currentTrigger) {
      const val = trimmed.slice(7).trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        triggerIndex[currentTrigger].skills = val
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
      continue;
    }

    // weight: N
    if (trimmed.startsWith('weight:') && currentTrigger) {
      triggerIndex[currentTrigger].weight = parseInt(trimmed.slice(7).trim(), 10);
      continue;
    }
  }

  return { trigger_index: triggerIndex };
}

// ─── YAML: parse skill-metadata.yaml ─────────────────────────────────
// Structure: skills: { skill-name: { phase, domain, role, scope, ... } }

function parseSkillMetadataYaml(text) {
  const skills = {};
  const lines = text.split('\n');
  let inSkills = false;
  let currentSkill = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Enter skills section
    if (trimmed === 'skills:') {
      inSkills = true;
      continue;
    }

    // Leave skills at next top-level key
    if (inSkills && line.search(/\S/) === 0 && trimmed.endsWith(':') && trimmed !== 'skills:') {
      break;
    }

    if (!inSkills) continue;

    // Skill name key (2-space indent): csp-brainstorming:
    const skillMatch = trimmed.match(/^([\w-]+):\s*$/);
    if (skillMatch && line.startsWith('  ') && !line.startsWith('    ')) {
      currentSkill = skillMatch[1];
      skills[currentSkill] = {};
      continue;
    }

    // Property key (4-space indent): phase: define
    if (currentSkill && trimmed.includes(':') && line.startsWith('    ')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim();
      let val = trimmed.slice(colonIdx + 1).trim();

      // Inline array: [Read, Write, ...]
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
      }

      // Parse value
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (/^\d+$/.test(val)) val = parseInt(val, 10);

      skills[currentSkill][key] = val;
      continue;
    }
  }

  return { skills };
}

// ─── Main ────────────────────────────────────────────────────────────
console.log('🔨 Building graph.json from registry.json...');

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const triggersYaml = parseTriggersYaml(fs.readFileSync(TRIGGERS_PATH, 'utf8'));
const metadataYaml = parseSkillMetadataYaml(fs.readFileSync(METADATA_PATH, 'utf8'));

const nodes = {};
const edges = [];

// ─── 1. Skill nodes ─────────────────────────────────────────────────
const skillMetadata = metadataYaml?.skills || {};

for (const skill of registry.skills) {
  if (skill.deprecated) continue;

  const id = makeId(`skill:${skill.name}`);
  const meta = skillMetadata[skill.name] || {};

  nodes[id] = {
    id,
    kind: 'skill',
    name: skill.name,
    metadata: {
      layer: skill.layer,
      category: skill.category,
      ...(meta.phase && { phase: meta.phase }),
      ...(meta.domain && { domain: meta.domain }),
      ...(meta.role && { role: meta.role }),
      ...(meta.scope && { scope: meta.scope }),
      path: skill.path,
    },
  };

  // depends_on edges
  for (const dep of (skill.deps || [])) {
    const depId = makeId(`skill:${dep}`);
    edges.push({
      source: id,
      target: depId,
      kind: 'depends_on',
      metadata: {},
    });
  }
}

// ─── 2. Phase nodes + contains edges ─────────────────────────────────
const phases = new Set();
for (const skill of registry.skills) {
  if (skill.deprecated) continue;
  const meta = skillMetadata[skill.name];
  if (meta?.phase) phases.add(meta.phase);
}

for (const phase of phases) {
  const id = makeId(`phase:${phase}`);
  nodes[id] = { id, kind: 'phase', name: phase, metadata: {} };
}

// ─── 3. Category nodes + contains edges ──────────────────────────────
const categories = new Set();
for (const skill of registry.skills) {
  if (skill.deprecated) continue;
  categories.add(skill.category);
}

for (const cat of categories) {
  const id = makeId(`category:${cat}`);
  nodes[id] = { id, kind: 'category', name: cat, metadata: {} };
}

// Build contains edges: category→skill, phase→skill
for (const skill of registry.skills) {
  if (skill.deprecated) continue;
  const skillId = makeId(`skill:${skill.name}`);

  // category contains skill
  const catId = makeId(`category:${skill.category}`);
  if (nodes[catId]) {
    edges.push({ source: catId, target: skillId, kind: 'contains', metadata: {} });
  }

  // phase contains skill
  const meta = skillMetadata[skill.name];
  if (meta?.phase) {
    const phaseId = makeId(`phase:${meta.phase}`);
    if (nodes[phaseId]) {
      edges.push({ source: phaseId, target: skillId, kind: 'contains', metadata: {} });
    }
  }
}

// ─── 4. Trigger nodes + triggers edges ───────────────────────────────
const triggerIndex = triggersYaml?.trigger_index || {};

for (const [keyword, config] of Object.entries(triggerIndex)) {
  const triggerId = makeId(`trigger:${keyword}`);
  nodes[triggerId] = { id: triggerId, kind: 'trigger', name: keyword, metadata: {} };

  const skills = config.skills || [];
  for (const skillName of skills) {
    const skillId = makeId(`skill:${skillName}`);
    if (nodes[skillId]) {
      edges.push({ source: triggerId, target: skillId, kind: 'triggers', metadata: {} });
    }
  }
}

// ─── 5. Build output ─────────────────────────────────────────────────
const stats = {
  node_count: Object.keys(nodes).length,
  edge_count: edges.length,
  skill_count: registry.skills.filter(s => !s.deprecated).length,
  trigger_count: Object.keys(triggerIndex).length,
  phase_count: phases.size,
  category_count: categories.size,
};

const graph = {
  version: registry.version,
  generated_at: new Date().toISOString(),
  nodes,
  edges,
  stats,
};

// Ensure output directories exist
fs.mkdirSync(path.dirname(GRAPH_OUTPUT), { recursive: true });
fs.writeFileSync(GRAPH_OUTPUT, JSON.stringify(graph, null, 2), 'utf8');
console.log(`✅ Written: ${GRAPH_OUTPUT}`);

try {
  fs.mkdirSync(path.dirname(GRAPH_OUTPUT_DOT_CSP), { recursive: true });
  fs.writeFileSync(GRAPH_OUTPUT_DOT_CSP, JSON.stringify(graph, null, 2), 'utf8');
  console.log(`✅ Written: ${GRAPH_OUTPUT_DOT_CSP}`);
} catch (e) {
  console.log(`⚠️  Could not write ${GRAPH_OUTPUT_DOT_CSP}: ${e.message}`);
}

console.log(`📊 Stats: ${stats.skill_count} skills, ${stats.trigger_count} triggers, ${stats.phase_count} phases, ${stats.category_count} categories`);
console.log(`📊 Nodes: ${stats.node_count}, Edges: ${stats.edge_count}`);
