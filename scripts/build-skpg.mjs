// scripts/build-skpg.mjs
// Build the Skill Knowledge Graph from registry.json + skill-metadata.yaml + SKILL.md files

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parseSimpleYaml } from '../shared/scripts/lib/yaml.mjs';

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

    // Related skills — guard against non-array frontmatter values (string / object),
    // which previously crashed the whole build (TypeError: not iterable).
    if (Array.isArray(fm.related_skills)) {
      for (const rel of fm.related_skills) {
        const relName = String(rel).replace(/^csp:/, '');
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

  // Sort index keys for deterministic output (subsumes rebuild-skpg-index.mjs,
  // which only re-sorted what build-skpg already produced).
  const sortedIndex = Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b))
  );

  return { graph, index: sortedIndex };
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
