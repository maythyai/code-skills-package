---
name: csp-graph-build
description: "Build and maintain the code knowledge graph. Use when indexing a new repository, updating a stale graph after changes, or diagnosing graph health issues. Covers initial build, incremental updates, custom language support, and graph integrity verification."
layer: 2
category: workflow
version: 1.0.0
phase: build
domain: architecture
role: specialist
scope: implementation
tools: [Bash, Read, Glob, Grep]
triggers:
  keywords: ["build graph", "index codebase", "update graph", "graph stale", "rebuild graph", "graph health"]
  intents: ["user wants to build code graph for new repo", "graph needs updating after changes"]
  patterns: ["code-review-graph build", "code-review-graph update"]
dependencies:
  skills: [csp-code-graph]
related_skills: [csp-graph-impact, csp-graph-review, csp-graph-architecture]
---

# Graph Build & Maintenance

Build the structural knowledge graph from a codebase, keep it fresh via incremental updates, and verify its integrity. The graph is the foundation for all downstream analysis — impact, review, architecture, and refactoring all depend on a fresh, accurate graph.

## When to Build

| Trigger | Action |
|---------|--------|
| New repository / first session | Full build |
| After large merge (> 20 files) | Full rebuild |
| After small edits (< 20 files) | Incremental update |
| Graph age > 1 hour with active editing | Incremental update |
| Graph query returns suspicious empty results | Health check → rebuild if corrupt |

## Phase 1: Initial Build

### Pre-flight Checks

```bash
# Verify tool is installed
code-review-graph --version || pip install code-review-graph

# Check repo is a git repository
git rev-parse --is-inside-work-tree

# Estimate codebase size (for time expectation)
find . -name "*.py" -o -name "*.ts" -o -name "*.js" -o -name "*.go" -o -name "*.java" -o -name "*.rs" | wc -l
```

### Build Command

```bash
# Full build (parses all supported files, builds SQLite graph)
code-review-graph build

# With verbose output for debugging
code-review-graph build --verbose

# Specify custom config
code-review-graph build --config .code-review-graph/config.toml
```

### What Happens During Build

1. **File discovery** — walk repo, skip `.gitignore`'d paths, identify supported languages
2. **AST parsing** — Tree-sitter parses each file, extracts nodes (File, Class, Function, Type, Test)
3. **Edge extraction** — identify CALLS, IMPORTS_FROM, INHERITS, IMPLEMENTS, CONTAINS, TESTED_BY relationships
4. **Post-processing** — resolve ambiguous edges, compute qualified names, build FTS5 index
5. **Flow detection** — identify execution flows from entry points
6. **Community detection** — cluster related code via Leiden algorithm
7. **Storage** — write to `.code-review-graph/graph.db` (SQLite, WAL mode)

### Expected Output

```
Parsed 342 files (28,451 lines) in 4.2s
Nodes: 3,847 (files: 342, classes: 412, functions: 2,891, tests: 202)
Edges: 12,453 (calls: 8,234, imports: 2,102, contains: 1,847, tested_by: 270)
Communities: 14
Flows: 23
Graph stored at .code-review-graph/graph.db (4.2 MB)
```

## Phase 2: Incremental Update

For ongoing sessions, only re-parse changed files (< 2 seconds typical):

```bash
# Incremental update (detects changed files via SHA-256 hash)
code-review-graph update

# After a git operation
code-review-graph update --since-last-commit
```

### Incremental Logic

1. Hash all tracked files (SHA-256)
2. Compare against stored hashes
3. Re-parse only changed/added files
4. Remove nodes/edges from deleted files
5. Re-resolve edges that reference changed nodes
6. Update FTS index for changed content
7. Recompute affected communities (local re-clustering)

### Automation via Hooks

For AI coding sessions, configure auto-update hooks:

```json
// .code-review-graph/hooks.json
{
  "PostToolUse": {
    "Write|Edit": "code-review-graph update --quiet",
    "Bash": "code-review-graph update --quiet"
  },
  "SessionStart": "code-review-graph status"
}
```

## Phase 3: Custom Language Support

For languages not in the default 35+ set:

```toml
# .code-review-graph/languages.toml
[languages.mylang]
extensions = [".ml", ".mylang"]
function_nodes = ["function_declaration", "method_declaration"]
class_nodes = ["class_declaration", "struct_declaration"]
call_expression = "call_expression"
import_statement = "import_statement"
```

## Phase 4: Health Verification

```bash
# Check graph status (age, node count, staleness)
code-review-graph status

# Verify integrity (no dangling edges, FTS consistent)
code-review-graph verify

# Force rebuild if corrupt
code-review-graph build --force
```

### Health Indicators

| Indicator | Healthy | Warning | Action |
|-----------|---------|---------|--------|
| Graph age | < 5 min | > 1 hour | Incremental update |
| Dangling edges | 0 | > 10 | Rebuild |
| FTS sync | Consistent | Lagging | `update --reindex` |
| File coverage | > 95% of repo files | < 80% | Check language support |
| Orphan nodes | < 5% | > 20% | Verify parse rules |

## Phase 5: Multi-Repo Setup

For monorepos or multi-repo workflows:

```bash
# Register multiple repos
code-review-graph register /path/to/repo-a
code-review-graph register /path/to/repo-b

# Daemon mode (background watch + auto-update)
crg-daemon start --repos repo-a,repo-b --interval 30s
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Build hangs | Very large repo (> 10k files) | Add `--workers 4` for parallel parse |
| Empty graph | Unsupported language | Check `languages.toml`, add custom rules |
| Stale after edit | Hooks not configured | Add PostToolUse hook or run `update` manually |
| Missing edges | Framework-specific patterns | Enable framework detection in config |
| Permission error | SQLite WAL lock | Kill stale processes, remove `-wal` file |

## Configuration Reference

```toml
# .code-review-graph/config.toml
[build]
max_depth = 2              # BFS depth for impact analysis
parse_workers = 4          # Parallel parse threads
exclude = ["vendor/", "node_modules/", ".git/"]

[impact]
edge_weights = { CALLS = 1.0, INHERITS = 0.9, TESTED_BY = 0.7 }
depth_decay = 0.6          # Weight multiplier per hop

[embeddings]
provider = "local"         # local | gemini | openai-compatible
model = "all-MiniLM-L6-v2"

[server]
transport = "stdio"        # stdio | http
port = 3100
```
