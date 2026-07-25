#!/usr/bin/env node
/**
 * Rebuilds csp-router/skpg/index.json from graph.json.
 *
 * index.json maps node names to their IDs:
 *   - skill nodes: "csp-agent-teams" -> "<node.id>"
 *   - phase nodes: "phase:define" -> "<node.id>"
 *   - category nodes: "category:meta" -> "<node.id>"
 *   - trigger nodes are excluded
 *
 * Usage: node scripts/rebuild-skpg-index.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skpgDir = resolve(__dirname, "../csp-router/skpg");
const graphPath = resolve(skpgDir, "graph.json");
const indexPath = resolve(skpgDir, "index.json");

// Read graph.json
const graph = JSON.parse(readFileSync(graphPath, "utf-8"));

// Build name -> id map from nodes
const index = {};

for (const node of Object.values(graph.nodes)) {
  if (node.kind === "skill") {
    index[node.name] = node.id;
  } else if (node.kind === "phase") {
    index[`phase:${node.name}`] = node.id;
  } else if (node.kind === "category") {
    index[`category:${node.name}`] = node.id;
  }
  // trigger nodes are intentionally excluded
}

// Sort keys for deterministic output
const sorted = Object.fromEntries(
  Object.entries(index).sort(([a], [b]) => a.localeCompare(b))
);

// Write index.json
writeFileSync(indexPath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");

console.log(`Rebuilt index.json: ${Object.keys(sorted).length} entries written to ${indexPath}`);
