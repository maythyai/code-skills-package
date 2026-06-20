---
name: csp-monorepo-tooling
description: >
  Select, configure, and optimize monorepo tooling including Turborepo, Nx,
  pnpm workspaces, and Lerna for multi-package JavaScript/TypeScript projects.
  Use when setting up a monorepo, migrating from polyrepo, or optimizing
  build orchestration and CI pipelines for multi-package repositories.
version: 0.1.0
layer: 4
category: patterns
---

# Monorepo Tooling Selection and Configuration

Guide to choosing and configuring monorepo tools, with patterns for build orchestration, dependency management, and CI optimization.

## When to Activate

- Setting up a new monorepo or evaluating monorepo tooling options
- Migrating from a polyrepo architecture to a monorepo
- Optimizing CI/CD pipelines for affected-only builds
- Configuring shared dependencies, ESLint, and TypeScript across packages
- Implementing remote caching or incremental build strategies
- Establishing code-sharing patterns with internal packages

## Tool Comparison Matrix

| Feature | Turborepo | Nx | pnpm Workspaces | Yarn Workspaces |
|---|---|---|---|---|
| **Build orchestration** | Pipeline DAG | Project graph | None | None |
| **Task caching** | Local + remote | Local + Nx Cloud | None | None |
| **Affected detection** | Filter by glob | Computed graph | None | None |
| **Code generators** | No | Yes | No | No |
| **Module boundaries** | No | Yes (ESLint) | No | No |
| **Config complexity** | Low | Medium-High | Very Low | Very Low |
| **Package manager** | Any | Any | pnpm only | Yarn only |
| **Best for** | Speed-first | Enterprise | Simple workspaces | Yarn ecosystems |

### Decision Framework

```
Need enforced module boundaries + generators? -> Nx
Need build caching + parallel execution?      -> Turborepo (+ pnpm workspaces)
Simple workspace, no build orchestration?     -> pnpm workspaces alone

Production stack: pnpm workspaces + Turborepo (most common).
```

## Turborepo

### Project Structure

```
monorepo/
  turbo.json              # Pipeline configuration
  pnpm-workspace.yaml     # Workspace definition
  apps/
    web/                  # Next.js app
    api/                  # API server
  packages/
    ui/                   # Shared React components
    config/               # Shared ESLint, TS configs
    utils/                # Shared utilities
    database/             # Prisma schema + client
```

### Pipeline Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"]
    },
    "dev": { "dependsOn": ["^build"], "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"], "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [] },
    "test": { "dependsOn": ["build"], "outputs": ["coverage/**"] },
    "clean": { "cache": false }
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// Root package.json
{
  "name": "monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": { "turbo": "^2.4.0" }
}
```

### Remote Caching and Filters

```bash
# Enable remote caching
turbo login && turbo link

# Filter syntax
turbo run build --filter=web                        # Only web app + deps
turbo run build --filter='!api'                     # Everything except api
turbo run test --filter='...[origin/main]'          # Changed since main
turbo run lint --filter='...ui'                     # Packages depending on ui
turbo run build --filter=web --dry=json             # Preview without executing
```

## Nx

### Affected Commands and Project Graph

```bash
npx nx init                                        # Initialize Nx
npx nx graph                                       # Visualize dependency graph
npx nx affected -t build --base=origin/main        # Build affected only
npx nx affected -t test  --base=origin/main        # Test affected only
npx nx run web:build                               # Single project
npx nx run-many -t build -p web api --parallel=3   # Multiple projects
```

### Module Boundaries with ESLint

```jsonc
// apps/web/project.json
{ "name": "web", "tags": ["scope:frontend", "type:app"] }

// packages/database/project.json
{ "name": "database", "tags": ["scope:backend", "type:lib"] }
```

```javascript
// .eslintrc.js
module.exports = {
  plugins: ["@nx"],
  rules: {
    "@nx/enforce-module-boundaries": ["error", {
      depConstraints: [
        { sourceTag: "scope:frontend", onlyDependOnLibsWithTags: ["scope:frontend", "scope:shared"] },
        { sourceTag: "scope:backend",  onlyDependOnLibsWithTags: ["scope:backend", "scope:shared"] },
        { sourceTag: "type:app",       onlyDependOnLibsWithTags: ["type:lib"] },
      ],
    }],
  },
};
```

## pnpm Workspaces

### Workspace Protocol

```json
// apps/web/package.json
{
  "dependencies": {
    "@acme/ui": "workspace:*",         // Always use local version
    "@acme/utils": "workspace:^1.0.0", // Local, require compatible version
    "react": "^19.0.0"                 // External dependency
  }
}
```

```bash
# Filtering and execution
pnpm --filter @acme/web run build              # Single package
pnpm --filter @acme/web... run build           # Package + its dependencies
pnpm --filter ...@acme/ui run build            # Packages that depend on ui
pnpm --filter "...[origin/main]" run test      # Changed packages
```

## Monorepo CI Optimization

### Affected-Only Builds (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      - name: Build affected
        run: pnpm turbo run build --filter="...[origin/${{ github.base_ref || 'main' }}]"
      - name: Test affected
        run: pnpm turbo run test --filter="...[origin/${{ github.base_ref || 'main' }}]"

      # Cache turbo outputs
      - uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ github.sha }}
          restore-keys: turbo-${{ runner.os }}-
```

## Dependency Management

### Shared Configuration

```json
// Root package.json: shared devDependencies
{
  "devDependencies": {
    "typescript": "^5.7.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0",
    "vitest": "^3.0.0"
  }
}
```

### TypeScript Configuration Sharing

```json
// packages/config/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "esModuleInterop": true, "skipLibCheck": true,
    "declaration": true, "composite": true
  }
}

// packages/ui/tsconfig.json
{
  "extends": "@acme/config/tsconfig/base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "jsx": "react-jsx" },
  "include": ["src"],
  "references": [{ "path": "../utils" }]
}
```

### ESLint Configuration Sharing

```typescript
// packages/config/eslint/base.ts
import type { Linter } from "eslint";
export const baseConfig: Linter.Config = {
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
```

## Code Sharing Patterns

### Barrel Exports and Package Configuration

```typescript
// packages/utils/src/index.ts
export { formatDate, formatCurrency } from "./formatting";
export { debounce, throttle } from "./timing";
export type { ApiResponse, PaginatedResult } from "./types";
```

```json
// packages/utils/package.json
{
  "name": "@acme/utils",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./formatting": { "types": "./dist/formatting.d.ts", "import": "./dist/formatting.js" }
  },
  "sideEffects": false
}
```

## Migration from Polyrepo

### Strategy

```bash
# 1. Create monorepo scaffold
mkdir monorepo && cd monorepo && pnpm init && mkdir -p apps packages

# 2. Import repos preserving git history
git subtree add --prefix=apps/web git@github.com:org/web.git main --squash

# Alternative: git-filter-repo for cleaner history
git filter-repo --to-subdirectory-filter apps/web
```

### Migration Checklist

```
 1. Create workspace config (pnpm-workspace.yaml, turbo.json)
 2. Add root package.json with shared devDependencies
 3. Import each repo to packages/ or apps/ (preserve git history)
 4. Standardize tsconfig, eslint, and prettier
 5. Set up shared CI with affected-only builds
 6. Update imports to workspace references
 7. Remove per-repo CI configs
 8. Verify all packages build and test independently
 9. Enable remote caching
10. Update deployment pipelines for specific apps
```

## Anti-Patterns

- **Using Lerna for build orchestration**: Lerna lacks caching and parallel execution; use Turborepo or Nx for builds, reserve Lerna only for versioning/publishing.
- **Hoisting all dependencies to root**: Creates phantom dependencies that work in the monorepo but fail when published; use pnpm's strict isolation, hoist only tooling.
- **Not defining `outputs` in turbo.json**: Without outputs, Turborepo cannot cache artifacts and re-runs every task; always specify outputs for cacheable tasks.
- **Importing from `src` paths across packages**: `import { x } from '@acme/utils/src/formatting'` bypasses the public API; always import from the package entry point.
- **Running full CI on every PR**: In a 50+ package monorepo, building everything wastes CI minutes; always use affected-only filtering.
- **Skipping `private: true` on internal packages**: Internal packages without this flag can accidentally be published to npm; always mark non-publishable packages as private.

## Related Skills

- [[csp-package-publishing]] -- Publishing packages from monorepos with changesets
- [[csp-changelog-management]] -- Per-package changelogs and coordinated versioning
- [[csp-cicd-pipelines]] -- CI/CD optimization for monorepo pipelines
- [[csp-coding-standards]] -- Shared linting and formatting across packages
