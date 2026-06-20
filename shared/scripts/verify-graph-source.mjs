#!/usr/bin/env node
// verify-graph-source.mjs — Verify graph.json matches registry.json exactly
// Usage: node shared/scripts/verify-graph-source.mjs
//
// Ensures graph.json was generated from the current registry.json.
// Exit code 0 = match, 1 = mismatch.

import fs from 'fs';
import { createHash } from 'crypto';

const REGISTRY_PATH = 'csp-router/registry.json';
const GRAPH_PATH = 'csp-router/skpg/graph.json';

function makeId(name) {
  return createHash('md5').update(name).digest('hex').slice(0, 12);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

const regSkillNames = registry.skills
  .filter(s => !s.deprecated)
  .map(s => s.name)
  .sort();
const graphSkillNames = Object.values(graph.nodes)
  .filter(n => n.kind === 'skill')
  .map(n => n.name)
  .sort();

const regSet = new Set(regSkillNames);
const graphSet = new Set(graphSkillNames);

const onlyInReg = regSkillNames.filter(s => !graphSet.has(s));
const onlyInGraph = graphSkillNames.filter(s => !regSet.has(s));

let exitCode = 0;

if (onlyInReg.length > 0) {
  console.log(`❌ ${onlyInReg.length} skills in registry.json but NOT in graph.json:`);
  onlyInReg.forEach(s => console.log('  - ' + s));
  exitCode = 1;
}

if (onlyInGraph.length > 0) {
  console.log(`❌ ${onlyInGraph.length} skills in graph.json but NOT in registry.json:`);
  onlyInGraph.forEach(s => console.log('  - ' + s));
  exitCode = 1;
}

if (exitCode === 0) {
  console.log(`✅ graph.json matches registry.json: ${regSkillNames.length} skills (unique: ${new Set(regSkillNames).size})`);
}

process.exit(exitCode);
