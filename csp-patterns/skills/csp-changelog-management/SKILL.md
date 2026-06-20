---
name: csp-changelog-management
description: >
  Generate changelogs and manage release notes using changesets, semantic-release,
  and conventional commits. Use when automating changelog generation, setting up
  release pipelines, coordinating monorepo versioning, or writing user-facing
  release notes.
version: 0.1.0
layer: 4
category: patterns
---

# Changelog Generation and Release Notes Management

Patterns for automated changelog generation, release notes, and version management using conventional commits, changesets, and semantic-release.

## When to Activate

- Setting up automated changelog generation for a project or monorepo
- Choosing between changesets, semantic-release, and other tools
- Implementing conventional commits in a team workflow
- Creating release notes with migration guides and breaking change callouts
- Coordinating version bumps across multiple packages in a monorepo
- Configuring GitHub Actions for automated releases

## Changelog Format Comparison

| Format | Structure | Automation | Best For |
|---|---|---|---|
| **Keep a Changelog** | Manual, Added/Changed/Fixed | Low | Curated quality |
| **Conventional Changelog** | Auto from commits | High | Conventional commits |
| **Changesets** | Per-change markdown files | High | Monorepos |
| **GitHub Release Notes** | Auto from PRs/labels | Medium | GitHub-centric |

## Conventional Commits

### Format and Types

```
<type>(<scope>): <description>

[optional body]
[optional footer(s)]
```

| Type | Semver Bump | Description |
|---|---|---|
| `feat` | minor | New feature for the user |
| `fix` | patch | Bug fix |
| `perf` | patch | Performance improvement |
| `refactor` | - | Code change, no feature or fix |
| `docs` | - | Documentation only |
| `test` | - | Adding or correcting tests |
| `build` / `ci` / `chore` | - | Infrastructure/maintenance |

### Breaking Changes

```
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: POST /auth/token now returns { accessToken, refreshToken }
instead of { token }. Update your client code accordingly.
Refs: #234
```

### Enforcement with commitlint

```javascript
// commitlint.config.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always",
      ["feat", "fix", "perf", "refactor", "docs", "test", "build", "ci", "chore", "revert"]],
    "subject-max-length": [2, "always", 72],
  },
};
```

## Changesets

### Setup

```bash
npm install -D @changesets/cli
npx changeset init
```

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "acme/ui-library" }],
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@acme/web-app"]
}
```

### Creating Changesets

```markdown
<!-- .changeset/add-dark-mode.md -->
---
"@acme/ui": minor
"@acme/theme": minor
---
Add dark mode support to ThemeProvider with system preference detection
```

```markdown
<!-- .changeset/fix-modal.md -->
---
"@acme/ui": patch
---
Fix modal not closing on Escape key when focus is in an iframe
```

### Version and Publish Flow

```bash
npx changeset           # Interactive: select packages, bump type, write summary
npx changeset version   # Bumps versions, generates CHANGELOG.md entries
npx changeset publish   # Publishes all updated packages to npm
npx changeset tag       # Creates git tags for new versions
```

### GitHub Actions Release

```yaml
# .github/workflows/release.yml
name: Release
on:
  push: { branches: [main] }

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm, registry-url: "https://registry.npmjs.org" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build

      - uses: changesets/action@v1
        with:
          title: "chore: version packages"
          publish: pnpm changeset publish
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Snapshot Releases (PR Previews)

```yaml
# .github/workflows/snapshot.yml
name: Snapshot
on:
  pull_request:
    types: [labeled]

jobs:
  snapshot:
    if: github.event.label.name == 'release-snapshot'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, registry-url: "https://registry.npmjs.org" }
      - run: npm ci && npm run build
      - run: npx changeset version --snapshot pr-${{ github.event.pull_request.number }}
      - run: npx changeset publish --tag snapshot --no-git-tag
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## semantic-release

### Configuration

```javascript
// .releaserc.js
module.exports = {
  branches: ["main", { name: "next", prerelease: true }, { name: "beta", prerelease: true }],
  plugins: [
    ["@semantic-release/commit-analyzer", {
      preset: "conventionalcommits",
      releaseRules: [
        { type: "perf", release: "patch" },
        { breaking: true, release: "major" },
      ],
    }],
    ["@semantic-release/release-notes-generator", {
      preset: "conventionalcommits",
      presetConfig: {
        types: [
          { type: "feat", section: "Features" },
          { type: "fix", section: "Bug Fixes" },
          { type: "perf", section: "Performance" },
        ],
      },
    }],
    "@semantic-release/changelog",
    ["@semantic-release/npm", { npmPublish: true }],
    ["@semantic-release/git", {
      assets: ["CHANGELOG.md", "package.json"],
      message: "chore(release): ${nextRelease.version} [skip ci]",
    }],
    "@semantic-release/github",
  ],
};
```

```yaml
# .github/workflows/release.yml
name: Release
on:
  push: { branches: [main, next, beta] }

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0, persist-credentials: false }
      - uses: actions/setup-node@v4
        with: { node-version: 22, registry-url: "https://registry.npmjs.org" }
      - run: npm ci && npm run build && npm test
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Tool Decision Tree

```
Monorepo with multiple packages? -> changesets
Team uses conventional commits?  -> semantic-release (fully automated)
Otherwise?                       -> changesets (file-based, no commit convention needed)

Note: standard-version is deprecated. Use semantic-release or changesets.
```

## Release Notes Best Practices

```markdown
## [3.0.0] - 2025-03-15

### Highlights
- Data grid rewrite with virtual scrolling (10x for large datasets)
- New plugin system for extending component behavior

### Breaking Changes
- `DataGrid` API completely redesigned (see migration guide below)
- Dropped Node.js 16 support (minimum now 18)

### Migration Guide: DataGrid v2 to v3
Before: `<DataGrid data={rows} columns={cols} pageSize={25} />`
After:  `<DataGrid rows={rows} columns={cols}><DataGrid.Pagination pageSize={25} /></DataGrid>`

### Bug Fixes
- Fix column resize on touch devices (#530)

### Performance
- 35% smaller bundle via code splitting (#545)
```

## Anti-Patterns

- **Auto-generating changelogs without curation**: Raw commit logs are noisy; always curate release notes to highlight user-facing changes and add migration guides.
- **Breaking changes in patch releases**: A bug fix that changes an API signature is breaking regardless of intent; always bump major version.
- **No migration guide for major releases**: Users need actionable upgrade steps with before/after code examples, not just a list of changes.
- **Using `git log` directly as a changelog**: Raw history includes merge commits and internal noise; use conventional commits with a generator or curate manually.
- **Skipping changelog for "internal" changes**: Security patches and performance improvements affect downstream users; always document them.
- **Not versioning the changelog**: Without `## [version] - YYYY-MM-DD` headers, users cannot find what changed between versions.

## Related Skills

- [[csp-package-publishing]] -- Publishing workflows that consume changelog-generated versions
- [[csp-monorepo-tooling]] -- Monorepo tooling that integrates with changesets
- [[csp-git-conventions]] -- Conventional commit setup and enforcement
- [[csp-cicd-pipelines]] -- CI/CD integration for automated release pipelines
