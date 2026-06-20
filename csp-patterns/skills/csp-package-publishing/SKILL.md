---
name: csp-package-publishing
description: >
  Configure and automate package publishing workflows for npm, PyPI, and other
  registries including provenance, pre-release versioning, monorepo publishing,
  and security controls. Use when setting up CI-based publishing pipelines,
  managing pre-release channels, or securing registry access tokens.
version: 0.1.0
layer: 4
category: patterns
---

# Package Publishing Workflows

End-to-end patterns for publishing packages to npm, PyPI, and other registries, with CI automation, pre-release channels, and security best practices.

## When to Activate

- Setting up automated package publishing from CI/CD pipelines
- Configuring pre-release versioning (alpha, beta, RC) with dist-tags
- Publishing from a monorepo with coordinated versioning
- Implementing npm provenance or PyPI trusted publishing
- Securing registry access with OIDC, 2FA, and scoped tokens
- Testing packages locally before publishing (verdaccio, dry-run)

## npm Publishing

### Package Configuration

```json
{
  "name": "@acme/ui-components",
  "version": "1.0.0",
  "publishConfig": { "access": "public", "registry": "https://registry.npmjs.org" },
  "files": ["dist", "README.md", "LICENSE"],
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.mjs", "require": "./dist/index.js" },
    "./styles.css": "./dist/styles.css"
  },
  "sideEffects": ["./dist/styles.css"],
  "engines": { "node": ">=18.0.0" }
}
```

### Pre-Publish Checks

```bash
#!/usr/bin/env bash
set -euo pipefail

# Verify clean state
[[ $(git branch --show-current) == "main" ]] || { echo "Must be on main"; exit 1; }
[[ -z $(git status --porcelain) ]] || { echo "Uncommitted changes"; exit 1; }

# Run checks
npm test -- --coverage --ci
npm run typecheck
npm run lint
npm run build
[[ -d "dist" ]] || { echo "No dist/ output"; exit 1; }

# Preview package contents
npm pack --dry-run 2>&1 | grep "npm notice"
echo "All pre-publish checks passed."
```

### Version Bumping

```bash
npm version patch                      # 1.2.3 -> 1.2.4
npm version minor                      # 1.2.3 -> 1.3.0
npm version major                      # 1.2.3 -> 2.0.0
npm version prerelease --preid=alpha   # 1.2.3 -> 1.2.4-alpha.0
npm version preminor --preid=beta      # 1.2.3 -> 1.3.0-beta.0

# Publish with dist-tags
npm publish --tag next                 # npm install @acme/ui@next
npm publish --tag beta                 # npm install @acme/ui@beta
npm publish                            # Default "latest" tag
```

## PyPI Publishing

### Build Backend Comparison

| Backend | Speed | Best For |
|---|---|---|
| **hatchling** | Fast | Modern Python projects |
| **poetry** | Medium | All-in-one (deps + build) |
| **setuptools** | Medium | Legacy, max compatibility |
| **flit** | Fast | Simple pure-Python packages |

### Hatchling Configuration

```toml
# pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "acme-sdk"
version = "1.2.0"
description = "Python SDK for the Acme API"
requires-python = ">=3.10"
dependencies = ["httpx>=0.27.0", "pydantic>=2.0"]

[project.urls]
Homepage = "https://github.com/acme/sdk-python"
Changelog = "https://github.com/acme/sdk-python/blob/main/CHANGELOG.md"

[tool.hatch.build.targets.wheel]
packages = ["src/acme"]
```

### Trusted Publishing (OIDC)

```yaml
# .github/workflows/publish-pypi.yml
name: Publish to PyPI
on:
  release: { types: [published] }

permissions:
  id-token: write  # Required for OIDC

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: pypi
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install hatch && hatch build
      - uses: pypa/gh-action-pypi-publish@release/v1
        # No API token needed -- uses OIDC trusted publishing
```

## GitHub Actions Publishing

### npm with Provenance

```yaml
# .github/workflows/publish-npm.yml
name: Publish to npm
on:
  release: { types: [published] }

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, registry-url: "https://registry.npmjs.org" }
      - run: npm ci && npm run build && npm test
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Pre-Release Pipeline

```yaml
# .github/workflows/prerelease.yml
name: Pre-release
on:
  push: { branches: ["next", "beta"] }

permissions:
  id-token: write

jobs:
  prerelease:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, registry-url: "https://registry.npmjs.org" }
      - run: npm ci && npm run build && npm test
      - name: Version and publish
        run: |
          BRANCH="${GITHUB_REF#refs/heads/}"
          npm version prerelease --preid="${BRANCH}" --no-git-tag-version
          npm publish --tag "${BRANCH}" --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Testing Before Publish

### Local Registry with Verdaccio

```yaml
# verdaccio.yml
storage: ./storage
uplinks:
  npmjs: { url: https://registry.npmjs.org/ }
packages:
  "@acme/*": { access: $all, publish: $all }
  "**": { access: $all, publish: $all, proxy: npmjs }
listen: 0.0.0.0:4873
```

```bash
npx verdaccio --config verdaccio.yml
npm adduser --registry http://localhost:4873
npm publish --registry http://localhost:4873

# Test installation
cd /tmp && mkdir test && cd test
npm install @acme/ui-components --registry http://localhost:4873
```

### npm Pack Dry Run

```bash
npm pack --dry-run          # Preview included files
npm pack                    # Create tarball for inspection
tar -tzf acme-ui-1.0.0.tgz # List contents
npm install ./acme-ui-1.0.0.tgz  # Test local install
```

## Monorepo Publishing with Changesets

```bash
pnpm add -Dw @changesets/cli && npx changeset init
npx changeset               # Create changeset (interactive)
npx changeset version        # Bump versions + generate changelogs
npx changeset publish        # Publish to npm
```

```json
// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@acme/web", "@acme/api"]
}
```

## Security

```bash
# Granular access tokens (recommended over classic tokens)
# npmjs.com/settings/tokens -> Granular Access
# Scope: Read and write, Packages: @acme/*, Expiration: 90 days

# .npmrc for CI (environment variable, NEVER commit tokens)
@acme:registry=https://registry.npmjs.org
//registry.npmjs.org/:_authToken=${NPM_TOKEN}

# Require 2FA for publishing
npm require-2fa --package @acme/ui-components
```

## Deprecation

```bash
# Deprecate a version range
npm deprecate @acme/old-package@">=1.0.0 <2.0.0" \
  "Deprecated. Use @acme/new-package instead."

# Unpublish (within 72 hours only)
npm unpublish @acme/package@1.0.0-beta.1
```

## Anti-Patterns

- **Publishing without `files` field**: Without it, npm publishes everything except standard ignores, often including source and tests; always specify which files to include.
- **Skipping `--provenance`**: Packages without provenance lack a verifiable link to source and CI; always use `--provenance` in CI publishing.
- **Committing npm tokens to .npmrc**: Tokens in git history are permanently exposed; use environment variables and CI secrets exclusively.
- **Missing `private: true` on internal packages**: Internal utilities can be accidentally published to public registries; always set `"private": true`.
- **Not testing installation before publishing**: Builds may pass but installs fail due to missing files or broken `exports` paths; always run `npm pack --dry-run` and test in a fresh project.
- **Using `latest` tag for pre-releases**: Publishing pre-releases to `latest` gives users unstable code via default `npm install`; always use dedicated dist-tags (`next`, `beta`).

## Related Skills

- [[csp-changelog-management]] -- Changesets integration and changelog generation
- [[csp-monorepo-tooling]] -- Monorepo configuration for multi-package publishing
- [[csp-cicd-pipelines]] -- CI/CD pipelines that trigger publishing workflows
- [[csp-git-conventions]] -- Commit conventions that feed into changelog generation
