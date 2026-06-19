// scripts/query-skpg.mjs
// Query the Skill Knowledge Graph

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const PROJECT_ROOT = resolve(process.argv[2] && (process.argv[2].startsWith('.') || process.argv[2].startsWith('/')) ? process.argv[2] : '.');
const SKPG_DIR = resolve(PROJECT_ROOT, '.csp', 'skpg');

function nodeId(kind, name) {
  return createHash('sha256').update(`${kind}::${name}`).digest('hex').slice(0, 12);
}

function loadGraph() {
  try {
    return JSON.parse(readFileSync(resolve(SKPG_DIR, 'graph.json'), 'utf8'));
  } catch (e) {
    console.error(`Error loading graph.json: ${e.message}`);
    process.exit(1);
  }
}

function loadIndex() {
  try {
    return JSON.parse(readFileSync(resolve(SKPG_DIR, 'index.json'), 'utf8'));
  } catch (e) {
    console.warn(`Warning: Could not load index.json: ${e.message}`);
    return {};
  }
}

function findNodeByName(graph, kind, name) {
  const id = nodeId(kind, name);
  return graph.nodes[id] || null;
}

function getConnectedNodes(graph, nodeId, direction = 'outgoing') {
  const connected = [];
  for (const edge of graph.edges) {
    if (direction === 'outgoing' && edge.source === nodeId) {
      connected.push({ ...edge, targetNode: graph.nodes[edge.target] });
    } else if (direction === 'incoming' && edge.target === nodeId) {
      connected.push({ ...edge, sourceNode: graph.nodes[edge.source] });
    }
  }
  return connected;
}

function queryNode(name) {
  const graph = loadGraph();
  const index = loadIndex();

  // Try to find by name in index first
  let id = index[name];
  if (!id) {
    // Try phase: prefix
    id = index[`phase:${name}`];
  }
  if (!id) {
    // Try category: prefix
    id = index[`category:${name}`];
  }

  if (!id || !graph.nodes[id]) {
    console.log(`Node not found: ${name}`);
    return;
  }

  const node = graph.nodes[id];
  console.log(`\n=== Node: ${name} ===`);
  console.log(`ID: ${node.id}`);
  console.log(`Kind: ${node.kind}`);
  if (node.metadata && Object.keys(node.metadata).some(k => node.metadata[k])) {
    console.log(`Metadata:`, JSON.stringify(node.metadata, null, 2));
  }

  // Show outgoing edges (dependencies, related_to, etc.)
  const outgoing = getConnectedNodes(graph, id, 'outgoing');
  if (outgoing.length > 0) {
    console.log(`\nOutgoing relationships (${outgoing.length}):`);
    for (const edge of outgoing) {
      const targetName = edge.targetNode?.name || edge.target;
      console.log(`  └─ ${edge.kind} → ${targetName}`);
    }
  }

  // Show incoming edges (what depends on this, what triggers this, etc.)
  const incoming = getConnectedNodes(graph, id, 'incoming');
  if (incoming.length > 0) {
    console.log(`\nIncoming relationships (${incoming.length}):`);
    for (const edge of incoming) {
      const sourceName = edge.sourceNode?.name || edge.source;
      console.log(`  └─ ${sourceName} ─${edge.kind}→ (this)`);
    }
  }
}

function queryStats() {
  const graph = loadGraph();
  console.log('\n=== SKPG Statistics ===');
  console.log(JSON.stringify(graph.stats, null, 2));

  // Additional computed stats
  const kinds = {};
  for (const node of Object.values(graph.nodes)) {
    kinds[node.kind] = (kinds[node.kind] || 0) + 1;
  }
  console.log('\nNodes by kind:');
  for (const [kind, count] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kind}: ${count}`);
  }

  // Edge type distribution
  const edgeTypes = {};
  for (const edge of graph.edges) {
    edgeTypes[edge.kind] = (edgeTypes[edge.kind] || 0) + 1;
  }
  console.log('\nEdges by type:');
  for (const [type, count] of Object.entries(edgeTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
}

function queryList(kind) {
  const graph = loadGraph();
  const nodes = Object.values(graph.nodes).filter(n => n.kind === kind);
  console.log(`\n=== ${kind} nodes (${nodes.length}) ===`);
  for (const node of nodes.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  - ${node.name}`);
  }
}

function main() {
  // Args: node scripts/query-skpg.mjs [project_root] <command> [args...]
  // If argv[2] looks like a path (starts with . or /), it's the project root
  const argOffset = (process.argv[2] && (process.argv[2].startsWith('.') || process.argv[2].startsWith('/'))) ? 3 : 2;
  const args = process.argv.slice(argOffset);
  const command = args[0];

  if (!command) {
    console.log('Usage:');
    console.log('  node scripts/query-skpg.mjs [project_root] node <name>  — Query a specific node');
    console.log('  node scripts/query-skpg.mjs [project_root] stats        — Show graph statistics');
    console.log('  node scripts/query-skpg.mjs [project_root] list <kind>  — List nodes of a kind');
    console.log('');
    console.log('Kinds: skill, phase, category, trigger');
    process.exit(0);
  }

  switch (command) {
    case 'node':
      if (args[1]) {
        queryNode(args[1]);
      } else {
        console.log('Error: node name required');
        console.log('Usage: node scripts/query-skpg.mjs [project_root] node <name>');
        process.exit(1);
      }
      break;
    case 'stats':
      queryStats();
      break;
    case 'list':
      if (args[1]) {
        queryList(args[1]);
      } else {
        console.log('Error: kind required');
        console.log('Usage: node scripts/query-skpg.mjs [project_root] list <kind>');
        console.log('Kinds: skill, phase, category, trigger');
        process.exit(1);
      }
      break;
    default:
      console.log(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main();
