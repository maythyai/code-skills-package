# Parallel Detection Algorithm

> Detailed specification for detecting parallelizable tasks and grouping them safely.

## Overview

The parallel detection algorithm analyzes a workflow's tasks to determine which can safely execute concurrently. It operates at three levels: file overlap, shared resources, and semantic dependencies.

## File Dependency Analysis

### Input Format

Each task declares its file scope:

```json
{
  "name": "task-id",
  "files": [
    "src/components/Button.tsx",
    "src/pages/",
    "tests/unit/button.test.ts"
  ]
}
```

### Path Resolution

1. **Directory expansion**: `src/pages/` expands to all files under that directory (recursive)
2. **Glob support**: `src/**/*.test.ts` is supported via standard glob patterns
3. **Normalization**: All paths are normalized relative to repo root, no trailing slashes
4. **Symlink handling**: Symlinks are resolved to their real paths before comparison

### Overlap Detection

Two tasks overlap if any of the following is true:

```
overlap(A, B) :=
  ∃ file_a ∈ expand(A.files), file_b ∈ expand(B.files)
  where file_a == file_b
```

**Directory-level shortcut**: If `A.files` contains `src/utils/` and `B.files` contains `src/utils/helper.ts`, they overlap because `helper.ts` is within `src/utils/`.

### Complexity

- Naive: O(N² × F) where N = tasks, F = average files per task
- Optimized: Build a file→task index (hash map), then check for multi-mapped files. O(N × F)

## Parallel Group Partitioning

### Algorithm: Graph Coloring Approach

1. Build a **conflict graph** where nodes are tasks and edges represent overlaps
2. Find the **chromatic number** approximation using greedy coloring
3. Each color class becomes a parallel group
4. Order groups by dependency constraints (if any)

### Pseudocode

```python
def partition_into_groups(tasks):
    # Step 1: Build conflict graph
    conflicts = {}
    for i, task_a in enumerate(tasks):
        for j, task_b in enumerate(tasks):
            if i < j and has_overlap(task_a, task_b):
                conflicts.setdefault(i, set()).add(j)
                conflicts.setdefault(j, set()).add(i)

    # Step 2: Greedy graph coloring
    colors = {}
    for task_idx in sorted(conflicts.keys(), key=lambda k: -len(conflicts[k])):
        neighbor_colors = {colors[n] for n in conflicts[task_idx] if n in colors}
        color = 0
        while color in neighbor_colors:
            color += 1
        colors[task_idx] = color

    # Assign non-conflicting tasks to color 0
    for i in range(len(tasks)):
        if i not in colors:
            colors[i] = 0

    # Step 3: Group by color
    groups = defaultdict(list)
    for task_idx, color in colors.items():
        groups[color].append(tasks[task_idx])

    return [groups[c] for c in sorted(groups.keys())]
```

### Ordering Within Groups

Tasks within the same parallel group have no ordering constraint. However, if the workflow specifies explicit dependencies (`depends_on`), those take precedence:

```json
{
  "tasks": [
    { "name": "schema", "files": ["db/schema.prisma"] },
    { "name": "api", "files": ["src/api/"], "depends_on": ["schema"] }
  ]
}
```

In this case, `schema` and `api` cannot be in the same parallel group regardless of file overlap.

## Conflict Detection Rules

### Rule 1: Exact File Match

```
Task A: src/config.ts
Task B: src/config.ts
→ CONFLICT
```

### Rule 2: Directory Containment

```
Task A: src/utils/
Task B: src/utils/string.ts
→ CONFLICT (B's file is within A's directory)
```

### Rule 3: Shared Resource Files

Any task modifying a shared resource file conflicts with ALL other tasks in the same stage.

### Rule 4: Generated File Conflicts

If two tasks generate files into the same output directory (e.g., both produce files in `dist/` or `build/`), they conflict unless the output filenames are guaranteed unique.

### Rule 5: Lock File Conflicts

Tasks that may trigger lock file updates (adding dependencies, updating versions) conflict with each other:

- Any task with `package.json` in its files
- Any task whose skill is known to install packages (e.g., `csp-executing-plans` with npm install steps)

## Shared Resource List

The following files and directories are treated as global shared resources:

### Package Management

| File | Ecosystem |
|------|-----------|
| `package.json` | Node.js / npm |
| `package-lock.json` | npm |
| `yarn.lock` | Yarn |
| `pnpm-lock.yaml` | pnpm |
| `bun.lockb` | Bun |
| `Cargo.toml`, `Cargo.lock` | Rust |
| `go.mod`, `go.sum` | Go |
| `pyproject.toml`, `requirements.txt`, `Pipfile.lock` | Python |
| `Gemfile`, `Gemfile.lock` | Ruby |
| `composer.json`, `composer.lock` | PHP |
| `pom.xml`, `build.gradle`, `build.gradle.kts` | Java/Kotlin |

### Configuration

| File | Purpose |
|------|---------|
| `tsconfig.json`, `tsconfig.*.json` | TypeScript config |
| `.eslintrc*`, `eslint.config.*` | ESLint |
| `.prettierrc*`, `prettier.config.*` | Prettier |
| `biome.json`, `biome.jsonc` | Biome |
| `.editorconfig` | Editor settings |
| `jest.config.*`, `vitest.config.*` | Test runner |
| `vite.config.*`, `next.config.*`, `webpack.config.*` | Bundler |
| `tailwind.config.*`, `postcss.config.*` | CSS |
| `.env`, `.env.*` | Environment variables |

### Infrastructure

| File/Directory | Purpose |
|----------------|---------|
| `Makefile` | Build automation |
| `Dockerfile`, `docker-compose.yml` | Containerization |
| `.github/workflows/` | GitHub Actions |
| `.gitlab-ci.yml` | GitLab CI |
| `Jenkinsfile` | Jenkins |
| `.circleci/` | CircleCI |
| `terraform/`, `*.tf` | Infrastructure as Code |
| `k8s/`, `helm/` | Kubernetes |

### Database

| Directory | Purpose |
|-----------|---------|
| `migrations/`, `db/migrate/` | Database migrations |
| `prisma/migrations/` | Prisma migrations |
| `drizzle/` | Drizzle migrations |
| `seeds/`, `db/seeds/` | Seed data |

## Degradation to Serial Execution

### When Degradation Occurs

1. **File overlap detected** between two tasks → they are placed in separate groups
2. **Shared resource modification** → the modifying task runs alone in its group
3. **Explicit dependency** (`depends_on`) → enforced ordering
4. **User override** → user manually marks tasks as serial

### Degradation Output

When degradation occurs, the system outputs:

```
⚠️ Parallel Degradation Notice

Original plan: [frontend ∥ backend ∥ config] (3 parallel)
Degraded plan: [frontend ∥ backend] → [config] (2 + 1 serial)

Reason: 'config' modifies shared resource 'package.json'
Impact: Estimated 1.8x speedup instead of 2.7x
```

### Forced Serial Mode

Users can force all tasks to run serially:

```json
{
  "parallel": false
}
```

Or per-task:

```json
{
  "tasks": [
    { "name": "risky-task", "serial": true, "files": ["..."] }
  ]
}
```

A `serial: true` task always runs in its own group, never parallel with others.

## Edge Cases

### Empty File List

If a task has no `files` declared, it is assumed to potentially touch any file and is placed in its own serial group.

### Wildcard Patterns

`**/*` or overly broad patterns like `src/` on multiple tasks will cause most tasks to conflict. The algorithm warns when a task's file scope covers >50% of the repository.

### Binary Files

Binary files (images, compiled assets) follow the same overlap rules. Two tasks modifying the same image file conflict.

### Deleted Files

If Task A deletes a file and Task B modifies it, this is a conflict. Deletion is treated as a modification for overlap purposes.
