// scripts/build-skpg.mjs
// Build the Skill Knowledge Graph from registry.json + skill-metadata.yaml + SKILL.md files

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const PROJECT_ROOT = resolve(process.argv[2] || '.');
const CSP_ROOT = join(PROJECT_ROOT, 'csp-router');
const SKPG_DIR = join(PROJECT_ROOT, 'csp-router', 'skpg');

function nodeId(kind, name) {
  return createHash('sha256').update(`${kind}::${name}`).digest('hex').slice(0, 12);
}

function loadRegistry() {
  return JSON.parse(readFileSync(join(CSP_ROOT, 'registry.json'), 'utf8'));
}

function loadMetadata() {
  try {
    const content = readFileSync(join(CSP_ROOT, 'skill-metadata.yaml'), 'utf8');
    // Simple YAML parsing for our specific structure
    return parseSimpleYaml(content);
  } catch (e) {
    console.warn(`Warning: Could not load skill-metadata.yaml: ${e.message}`);
    return { skills: {} };
  }
}

function loadTriggers() {
  try {
    const content = readFileSync(join(CSP_ROOT, 'triggers.yaml'), 'utf8');
    // Simple YAML parsing for our specific structure
    return parseSimpleYaml(content);
  } catch (e) {
    console.warn(`Warning: Could not load triggers.yaml: ${e.message}`);
    return { trigger_index: {} };
  }
}

function parseSimpleYaml(content) {
  // Minimal YAML parser for our specific structure
  // Handles: nested objects, inline arrays [a, b], quoted keys, comments, blank lines

  const result = {};
  const lines = content.split('\n');

  // Stack tracks { indent, obj, key } - nesting context
  const stack = [{ indent: -1, obj: result, key: null }];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Pop stack until we find a parent with smaller indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    // Handle list items (- value)
    if (trimmed.startsWith('- ')) {
      const value = trimmed.substring(2).trim().replace(/^["']|["']$/g, '');
      if (Array.isArray(parent.obj[parent.key])) {
        parent.obj[parent.key].push(value);
      }
      continue;
    }

    // Handle key: value
    const colonMatch = trimmed.match(/^([^:]+):\s*(.*)/);
    if (colonMatch) {
      let key = colonMatch[1].trim();
      let value = colonMatch[2].trim();

      // Remove quotes from keys
      key = key.replace(/^["']|["']$/g, '');

      // Handle inline arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      } else if (value === '' || value === '|' || value === '>') {
        // Empty value means this key maps to a nested object
        parent.obj[key] = {};
        stack.push({ indent, obj: parent.obj[key], key: null });
        continue;
      } else {
        // Remove quotes from scalar values
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
      }

      parent.obj[key] = value;
    }
  }

  return result;
}

function findSkillFrontmatter(baseDir) {
  const results = {};
  const dirs = ['csp-meta', 'csp-workflow', 'csp-patterns', 'csp-runtime'];

  for (const dir of dirs) {
    const skillsDir = join(baseDir, dir, 'skills');
    if (!existsSync(skillsDir)) continue;
    scanDir(skillsDir, results);
  }
  return results;
}

function scanDir(dir, results) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      const skillMd = join(full, 'SKILL.md');
      if (existsSync(skillMd)) {
        try {
          const content = readFileSync(skillMd, 'utf8');
          const match = content.match(/^---\n([\s\S]*?)\n---/);
          if (match) {
            try {
              results[entry] = parseSimpleYaml(match[1]);
            } catch (e) {
              // Skip malformed frontmatter
            }
          }
        } catch (e) {
          // Skip unreadable files
        }
      }
      scanDir(full, results);
    }
  } catch (e) {
    // Skip unreadable directories
  }
}

function buildGraph() {
  const registry = loadRegistry();
  const metadata = loadMetadata();
  const triggers = loadTriggers();
  const frontmatters = findSkillFrontmatter(PROJECT_ROOT);

  const nodes = {};
  const edges = [];
  const index = {};

  // 1. Create skill nodes from registry
  for (const skill of registry.skills) {
    const id = nodeId('skill', skill.name);
    const meta = metadata.skills?.[skill.name] || {};
    const fm = frontmatters[skill.name] || {};

    nodes[id] = {
      id,
      kind: 'skill',
      name: skill.name,
      metadata: {
        layer: skill.layer,
        category: skill.category,
        phase: meta.phase || fm.phase,
        domain: meta.domain || fm.domain,
        role: meta.role || fm.role,
        path: skill.path,
      }
    };
    index[skill.name] = id;
  }

  // 2. Create phase nodes
  const phases = ['define', 'plan', 'build', 'verify', 'review', 'ship'];
  for (const phase of phases) {
    const id = nodeId('phase', phase);
    nodes[id] = { id, kind: 'phase', name: phase, metadata: {} };
    index[`phase:${phase}`] = id;
  }

  // 3. Create category nodes
  const categories = new Set(registry.skills.map(s => s.category).filter(Boolean));
  for (const cat of categories) {
    const id = nodeId('category', cat);
    nodes[id] = { id, kind: 'category', name: cat, metadata: {} };
    index[`category:${cat}`] = id;
  }

  // 4. Create trigger nodes and edges
  const triggerIndex = triggers.trigger_index || {};
  for (const [keyword, config] of Object.entries(triggerIndex)) {
    if (!config || !config.skills) continue;
    const id = nodeId('trigger', keyword);
    nodes[id] = { id, kind: 'trigger', name: keyword, metadata: {} };

    for (const skillName of config.skills) {
      const targetId = index[skillName];
      if (targetId) {
        edges.push({ source: id, target: targetId, kind: 'triggers', metadata: {} });
      }
    }
  }

  // 5. Create contains edges (category → skill)
  for (const skill of registry.skills) {
    if (skill.category) {
      const catId = index[`category:${skill.category}`];
      const skillId = index[skill.name];
      if (catId && skillId) {
        edges.push({ source: catId, target: skillId, kind: 'contains', metadata: {} });
      }
    }
  }

  // 6. Create phase contains edges
  for (const skill of registry.skills) {
    const meta = metadata.skills?.[skill.name] || {};
    const fm = frontmatters[skill.name] || {};
    const phase = meta.phase || fm.phase;
    if (phase) {
      const phaseId = index[`phase:${phase}`];
      const skillId = index[skill.name];
      if (phaseId && skillId) {
        edges.push({ source: phaseId, target: skillId, kind: 'contains', metadata: {} });
      }
    }
  }

  // 7. Create dependency and related_to edges from frontmatter
  for (const [name, fm] of Object.entries(frontmatters)) {
    const sourceId = index[name];
    if (!sourceId) continue;

    // Dependencies
    if (fm.dependencies?.skills) {
      for (const dep of fm.dependencies.skills) {
        const depName = dep.replace(/^csp:/, ''); // strip namespace
        const targetId = index[depName];
        if (targetId) {
          edges.push({ source: sourceId, target: targetId, kind: 'depends_on', metadata: {} });
        }
      }
    }

    // Related skills
    if (fm.related_skills) {
      for (const rel of fm.related_skills) {
        const relName = rel.replace(/^csp:/, '');
        const targetId = index[relName];
        if (targetId) {
          edges.push({ source: sourceId, target: targetId, kind: 'related_to', metadata: {} });
        }
      }
    }
  }

  // Deduplicate edges
  const edgeSet = new Set(edges.map(e => `${e.source}:${e.target}:${e.kind}`));
  const uniqueEdges = [...edgeSet].map(key => {
    const parts = key.split(':');
    // Handle case where key might have extra colons
    const kind = parts[parts.length - 1];
    const target = parts[parts.length - 2];
    const source = parts.slice(0, parts.length - 2).join(':');
    return { source, target, kind, metadata: {} };
  });

  const graph = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    nodes,
    edges: uniqueEdges,
    stats: {
      node_count: Object.keys(nodes).length,
      edge_count: uniqueEdges.length,
      skill_count: registry.skills.length,
      trigger_count: Object.keys(triggerIndex).length,
      phase_count: phases.length,
      category_count: categories.size,
    }
  };

  return { graph, index };
}

function main() {
  mkdirSync(SKPG_DIR, { recursive: true });

  const { graph, index } = buildGraph();

  writeFileSync(join(SKPG_DIR, 'graph.json'), JSON.stringify(graph, null, 2));
  writeFileSync(join(SKPG_DIR, 'index.json'), JSON.stringify(index, null, 2));

  console.log(`SKPG built successfully:`);
  console.log(`  Nodes: ${graph.stats.node_count}`);
  console.log(`  Edges: ${graph.stats.edge_count}`);
  console.log(`  Skills: ${graph.stats.skill_count}`);
  console.log(`  Triggers: ${graph.stats.trigger_count}`);
  console.log(`  Phases: ${graph.stats.phase_count}`);
  console.log(`  Categories: ${graph.stats.category_count}`);
}

main();
