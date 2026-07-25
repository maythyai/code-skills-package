#!/usr/bin/env node
/**
 * build-skpg-edges.mjs — Phase 4.17: Add depends_on/related_to edges to SKPG
 *
 * Reads graph.json and registry.json, generates semantic edges:
 * - depends_on: L2→L1 methodology, L3 build-resolver→reviewer, SKILL.md cross-refs
 * - related_to: same category, same language/framework, shared triggers
 *
 * Usage: node scripts/build-skpg-edges.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const GRAPH_FILE = join(ROOT, 'csp-router', 'skpg', 'graph.json');
const REGISTRY_FILE = join(ROOT, 'csp-router', 'registry.json');

const DRY_RUN = process.argv.includes('--dry-run');

// --- Load data ---
const graph = JSON.parse(readFileSync(GRAPH_FILE, 'utf8'));
const registry = JSON.parse(readFileSync(REGISTRY_FILE, 'utf8'));

const nodes = graph.nodes;
const edges = graph.edges;

// Build lookup maps
const nameToNode = new Map(); // skill name -> node id
const nodeToName = new Map(); // node id -> skill name
const skillMeta = new Map();  // skill name -> registry entry

for (const [id, node] of Object.entries(nodes)) {
  if (node.kind === 'skill') {
    nameToNode.set(node.name, id);
    nodeToName.set(id, node.name);
  }
}

for (const skill of registry.skills) {
  skillMeta.set(skill.name, skill);
}

// Track existing edges to avoid duplicates
const existingEdges = new Set();
for (const e of edges) {
  existingEdges.add(`${e.source}|${e.target}|${e.kind}`);
}

const newEdges = [];

function addEdge(sourceName, targetName, kind) {
  const sourceId = nameToNode.get(sourceName);
  const targetId = nameToNode.get(targetName);
  if (!sourceId || !targetId) return false;
  if (sourceId === targetId) return false;
  const key = `${sourceId}|${targetId}|${kind}`;
  if (existingEdges.has(key)) return false;
  existingEdges.add(key);
  newEdges.push({ source: sourceId, target: targetId, kind, metadata: {} });
  return true;
}

// --- Rule 1: L2 workflow skills depend on L1 methodology skills ---
// Mapping: L2 phase/workflow skills -> their L1 methodology parent
const l2ToL1Map = {
  'csp-plan-phase': 'csp-writing-plans',
  'csp-planning-phase': 'csp-writing-plans',
  'csp-execute-phase': 'csp-executing-plans',
  'csp-execute-plan': 'csp-executing-plans',
  'csp-implementation-phase': 'csp-executing-plans',
  'csp-verify-phase': 'csp-verification',
  'csp-validate-phase': 'csp-verification',
  'csp-spec-phase': 'csp-spec-driven-development',
  'csp-solutioning-phase': 'csp-spec-driven-development',
  'csp-discuss-phase': 'csp-interview-me',
  'csp-discovery-phase': 'csp-interview-me',
  'csp-mvp-phase': 'csp-mvp-scoping',
  'csp-analysis-phase': 'csp-brainstorming',
  'csp-secure-phase': 'csp-doubt-driven-development',
  'csp-ui-phase': 'csp-brainstorming',
  'csp-ai-integration-phase': 'csp-source-driven-development',
  'csp-plan-review-convergence': 'csp-doc-review',
  'csp-plan-checker': 'csp-writing-plans',
  'csp-eval-planner': 'csp-writing-plans',
  'csp-phase-researcher': 'csp-brainstorming',
};

// Also apply heuristic: L2 skills with "plan" in name -> csp-writing-plans
// L2 skills with "debug" -> csp-systematic-debugging
// L2 skills with "review" -> csp-requesting-code-review
let dependsOnCount = 0;

for (const [l2Name, l1Name] of Object.entries(l2ToL1Map)) {
  if (addEdge(l2Name, l1Name, 'depends_on')) dependsOnCount++;
}

// Heuristic L2 -> L1 based on name patterns
const l2Skills = registry.skills.filter(s => s.layer === 2);
const l1Skills = registry.skills.filter(s => s.layer === 1);
const l1Names = new Set(l1Skills.map(s => s.name));

for (const skill of l2Skills) {
  const name = skill.name;
  // Already mapped explicitly
  if (l2ToL1Map[name]) continue;

  let target = null;
  if (name.includes('debug') || name.includes('fix')) target = 'csp-systematic-debugging';
  else if (name.includes('review')) target = 'csp-requesting-code-review';
  else if (name.includes('plan') || name.includes('spec')) target = 'csp-writing-plans';
  else if (name.includes('test') || name.includes('verify') || name.includes('validate')) target = 'csp-verification';
  else if (name.includes('scope') || name.includes('mvp')) target = 'csp-mvp-scoping';
  else if (name.includes('tdd')) target = 'csp-tdd';
  else if (name.includes('git') || name.includes('branch') || name.includes('worktree')) target = 'csp-using-git-worktrees';

  if (target && l1Names.has(target)) {
    if (addEdge(name, target, 'depends_on')) dependsOnCount++;
  }
}

// --- Rule 2: L3 build-resolvers depend on their language reviewer ---
const buildResolvers = registry.skills.filter(s => s.layer === 3 && s.name.includes('build-resolver'));
const reviewerNames = new Set(
  registry.skills.filter(s => s.layer === 3 && s.name.includes('reviewer')).map(s => s.name)
);

for (const resolver of buildResolvers) {
  // csp-react-build-resolver -> csp-react-reviewer
  const lang = resolver.name.replace('csp-', '').replace('-build-resolver', '');
  const reviewerName = `csp-${lang}-reviewer`;
  if (reviewerNames.has(reviewerName)) {
    if (addEdge(resolver.name, reviewerName, 'depends_on')) dependsOnCount++;
  }
}

// --- Rule 3: Skills that reference other skills in SKILL.md content ---
// Scan SKILL.md files for "csp-" references
let crossRefCount = 0;
const allSkillNames = [...nameToNode.keys()];
const skillNamePattern = new RegExp(`\\b(${allSkillNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');

for (const skill of registry.skills) {
  const skillPath = join(ROOT, skill.path);
  if (!existsSync(skillPath)) continue;

  let content;
  try {
    content = readFileSync(skillPath, 'utf8');
  } catch {
    continue;
  }

  // Find all csp- references in the content
  const matches = content.match(skillNamePattern);
  if (!matches) continue;

  const referenced = new Set(matches);
  referenced.delete(skill.name); // Don't self-reference

  for (const ref of referenced) {
    if (nameToNode.has(ref)) {
      if (addEdge(skill.name, ref, 'depends_on')) crossRefCount++;
    }
  }
}

dependsOnCount += crossRefCount;

// --- Rule 4: related_to — same category ---
let relatedCount = 0;
const byCategory = new Map();
for (const skill of registry.skills) {
  const cat = skill.category || 'unknown';
  if (!byCategory.has(cat)) byCategory.set(cat, []);
  byCategory.get(cat).push(skill.name);
}

// For same-category relatedness, connect skills within the same layer+category
// to avoid O(n^2) explosion on the 341 "patterns" skills
const byLayerCategory = new Map();
for (const skill of registry.skills) {
  const key = `${skill.layer}:${skill.category}`;
  if (!byLayerCategory.has(key)) byLayerCategory.set(key, []);
  byLayerCategory.get(key).push(skill.name);
}

for (const [key, names] of byLayerCategory) {
  // Connect sequential pairs within same layer+category (chain topology)
  // This gives relatedness without O(n^2) explosion
  for (let i = 0; i < names.length - 1; i++) {
    if (addEdge(names[i], names[i + 1], 'related_to')) relatedCount++;
  }
}

// --- Rule 5: related_to — same language/framework ---
const langPrefixes = [
  'react', 'python', 'rust', 'go', 'java', 'kotlin', 'swift', 'cpp',
  'dart', 'django', 'fastapi', 'springboot', 'flutter', 'typescript',
  'php', 'csharp', 'fsharp', 'sql', 'react-native'
];

const byLang = new Map();
for (const skill of registry.skills) {
  const nameWithoutCsp = skill.name.replace('csp-', '');
  for (const lang of langPrefixes) {
    if (nameWithoutCsp.startsWith(lang + '-') || nameWithoutCsp === lang) {
      if (!byLang.has(lang)) byLang.set(lang, []);
      byLang.get(lang).push(skill.name);
      break;
    }
  }
}

for (const [lang, names] of byLang) {
  // Chain topology for language groups
  for (let i = 0; i < names.length - 1; i++) {
    if (addEdge(names[i], names[i + 1], 'related_to')) relatedCount++;
  }
}

// --- Rule 6: related_to — shared trigger keywords ---
// Build keyword -> skills index
const keywordIndex = new Map();
for (const skill of registry.skills) {
  const keywords = skill.triggers?.keywords || [];
  for (const kw of keywords) {
    const normalized = kw.toLowerCase().trim();
    if (!normalized) continue;
    if (!keywordIndex.has(normalized)) keywordIndex.set(normalized, []);
    keywordIndex.get(normalized).push(skill.name);
  }
}

for (const [kw, names] of keywordIndex) {
  if (names.length < 2 || names.length > 20) continue; // Skip overly common keywords
  for (let i = 0; i < names.length - 1; i++) {
    if (addEdge(names[i], names[i + 1], 'related_to')) relatedCount++;
  }
}

// --- Apply edges to graph ---
const totalDependsOn = newEdges.filter(e => e.kind === 'depends_on').length;
const totalRelatedTo = newEdges.filter(e => e.kind === 'related_to').length;

console.log('=== SKPG Edge Builder (Phase 4.17) ===');
console.log(`  depends_on edges generated: ${totalDependsOn}`);
console.log(`    - L2→L1 methodology: ${totalDependsOn - crossRefCount - buildResolvers.filter(r => { const lang = r.name.replace('csp-', '').replace('-build-resolver', ''); return reviewerNames.has(`csp-${lang}-reviewer`); }).length}`);
console.log(`    - L3 resolver→reviewer: ${buildResolvers.filter(r => { const lang = r.name.replace('csp-', '').replace('-build-resolver', ''); return reviewerNames.has(`csp-${lang}-reviewer`) && nameToNode.has(r.name); }).length}`);
console.log(`    - SKILL.md cross-refs: ${crossRefCount}`);
console.log(`  related_to edges generated: ${totalRelatedTo}`);
console.log(`  Total new edges: ${newEdges.length}`);
console.log('');

if (DRY_RUN) {
  console.log('[DRY RUN] No changes written.');
  console.log(`  Graph would go from ${edges.length} to ${edges.length + newEdges.length} edges.`);
  process.exit(0);
}

// Merge new edges into graph
graph.edges.push(...newEdges);

// Update stats
graph.stats.edge_count = graph.edges.length;
graph.stats.depends_on_count = graph.edges.filter(e => e.kind === 'depends_on').length;
graph.stats.related_to_count = graph.edges.filter(e => e.kind === 'related_to').length;
graph.stats.edge_types = {
  contains: graph.edges.filter(e => e.kind === 'contains').length,
  triggers: graph.edges.filter(e => e.kind === 'triggers').length,
  depends_on: graph.stats.depends_on_count,
  related_to: graph.stats.related_to_count,
};
graph.generated_at = new Date().toISOString();

// Write back
writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2) + '\n');

console.log(`[DONE] graph.json updated.`);
console.log(`  Previous edge count: ${edges.length - newEdges.length}`);
console.log(`  New edge count: ${graph.edges.length}`);
console.log(`  Stats: ${JSON.stringify(graph.stats, null, 2)}`);
