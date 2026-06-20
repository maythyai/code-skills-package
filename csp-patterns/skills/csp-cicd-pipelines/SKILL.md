---
name: csp-cicd-pipelines
description: >
  CI/CD pipeline patterns for GitHub Actions, GitLab CI, and CircleCI including
  matrix builds, reusable workflows, caching strategies, monorepo triggers,
  deployment gates, and branch protection integration. Use when designing or
  optimizing continuous integration and delivery pipelines.
metadata:
  origin: CSP
layer: 4
category: patterns
---

# CI/CD Pipeline Patterns

Production-grade CI/CD patterns for modern software delivery pipelines.

## When to Activate

- Designing or refactoring a CI/CD pipeline from scratch
- Implementing monorepo conditional builds with path filters
- Setting up matrix builds for multi-platform or multi-version testing
- Optimizing pipeline speed with caching and parallelism
- Configuring deployment gates, environment protection, and OIDC authentication
- Migrating between CI/CD platforms (GitHub Actions, GitLab CI, CircleCI)

## GitHub Actions

### Monorepo with Path Filters and Conditional Triggers

```yaml
# .github/workflows/ci.yml
name: csp-cicd-pipelines

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

# Cancel in-progress runs for the same branch
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Detect which packages changed
  changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
      shared: ${{ steps.filter.outputs.shared }}
    steps:
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'packages/api/**'
              - 'packages/shared/**'
            web:
              - 'packages/web/**'
              - 'packages/shared/**'
            shared:
              - 'packages/shared/**'

  api:
    needs: changes
    if: ${{ needs.changes.outputs.api == 'true' }}
    uses: ./.github/workflows/_reusable-build.yml
    with:
      package: api
      node-version: '22'
    secrets: inherit

  web:
    needs: changes
    if: ${{ needs.changes.outputs.web == 'true' }}
    uses: ./.github/workflows/_reusable-build.yml
    with:
      package: web
      node-version: '22'
    secrets: inherit
```

### Reusable Workflow (Called Workflow)

```yaml
# .github/workflows/_reusable-build.yml
name: Reusable Build

on:
  workflow_call:
    inputs:
      package:
        required: true
        type: string
      node-version:
        required: false
        type: string
        default: '22'
    outputs:
      artifact-name:
        description: "Name of the uploaded build artifact"
        value: ${{ jobs.build.outputs.artifact-name }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact-name: build-${{ inputs.package }}-${{ github.sha }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
          cache-dependency-path: packages/${{ inputs.package }}/package-lock.json

      - name: Install dependencies
        working-directory: packages/${{ inputs.package }}
        run: npm ci

      - name: Lint and test
        working-directory: packages/${{ inputs.package }}
        run: |
          npm run lint
          npm test -- --coverage

      - name: Build
        working-directory: packages/${{ inputs.package }}
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ inputs.package }}-${{ github.sha }}
          path: packages/${{ inputs.package }}/dist/
          retention-days: 7
```

### Matrix Builds for Multi-Platform Testing

```yaml
# .github/workflows/matrix-test.yml
name: Matrix Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false                # Run all matrix combinations even if one fails
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: ['20', '22', '24']
        exclude:
          - os: windows-latest
            node: '20'                # Skip this combination to save CI minutes
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'

      - run: npm ci
      - run: npm test

  # Notify only after all matrix jobs complete
  notify:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Check results
        run: |
          if [[ "${{ needs.test.result }}" == "failure" ]]; then
            echo "One or more matrix jobs failed"
            exit 1
          fi
```

### Composite Action for Shared Steps

```yaml
# .github/actions/setup-project/action.yml
name: 'Setup Project'
description: 'Checkout, install deps, and configure environment'

inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '22'
  registry-url:
    description: 'npm registry URL'
    required: false

outputs:
  cache-hit:
    description: 'Whether npm cache was hit'
    value: ${{ steps.npm-cache.outputs.cache-hit }}

runs:
  using: 'composite'
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        registry-url: ${{ inputs.registry-url }}

    - name: Cache node_modules
      id: npm-cache
      uses: actions/cache@v4
      with:
        path: node_modules
        key: ${{ runner.os }}-node-${{ inputs.node-version }}-${{ hashFiles('package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-${{ inputs.node-version }}-

    - name: Install dependencies
      if: steps.npm-cache.outputs.cache-hit != 'true'
      shell: bash
      run: npm ci
```

### OIDC Authentication for Cloud Deployments

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

permissions:
  id-token: write              # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production    # Environment protection rules apply
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
          aws-region: us-east-1
          role-session-name: github-actions-${{ github.run_id }}

      - name: Deploy
        run: |
          aws s3 sync ./dist s3://my-app-bucket/ --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"
```

### Environment Protection Rules and Deployment Gates

```yaml
# Deployment with staged environments and manual approval gates
name: Staged Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging        # Auto-deploy, no approval required
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - run: ./scripts/deploy.sh staging

  integration-tests:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:e2e -- --env=staging

  deploy-production:
    needs: integration-tests
    runs-on: ubuntu-latest
    environment:
      name: production          # Requires manual approval in repo settings
      url: https://app.example.com
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - run: ./scripts/deploy.sh production
```

## GitLab CI

### Multi-Project Pipeline with DAG Dependencies

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - security
  - deploy

variables:
  DOCKER_REGISTRY: registry.gitlab.com/$CI_PROJECT_PATH

# Shared configuration anchors
.test_template: &test_template
  image: node:22-alpine
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules/
  before_script:
    - npm ci

# Build stage
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t $DOCKER_REGISTRY:$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY:$CI_COMMIT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

# DAG dependencies: tests run in parallel after build
unit-tests:
  <<: *test_template
  stage: test
  script:
    - npm test -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura.xml

integration-tests:
  <<: *test_template
  stage: test
  services:
    - postgres:16-alpine
    - redis:7-alpine
  script:
    - npm run test:integration
  variables:
    DATABASE_URL: "postgres://postgres:postgres@postgres:5432/test"

e2e-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.44.0-jammy
  script:
    - npm ci
    - npx playwright test
  artifacts:
    when: on_failure
    paths:
      - playwright-report/

# Security scan in parallel with tests (DAG)
dependency-scan:
  stage: security
  image: node:22-alpine
  needs: ["build"]            # DAG: depends only on build, not on tests
  script:
    - npm audit --production
  allow_failure: true         # Don't block pipeline on advisories

# Deploy with manual gate
deploy-production:
  stage: deploy
  needs: ["build", "unit-tests", "integration-tests", "e2e-tests"]
  environment:
    name: production
    url: https://app.example.com
    on_stop: stop-production
  when: manual                # Manual trigger (deployment gate)
  script:
    - ./scripts/deploy.sh production

stop-production:
  stage: deploy
  environment:
    name: production
    action: stop
  when: manual
  script:
    - ./scripts/stop.sh production
```

### Include Templates for Shared Configuration

```yaml
# .gitlab/ci/docker.yml (shared template)
.docker-build:
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build --cache-from $DOCKER_REGISTRY:latest -t $DOCKER_REGISTRY:$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY:$CI_COMMIT_SHA

# .gitlab-ci.yml (main pipeline includes templates)
include:
  - local: '.gitlab/ci/docker.yml'
  - local: '.gitlab/ci/security.yml'
  - project: 'my-org/ci-templates'       # Cross-project templates
    ref: main
    file:
      - '/templates/deploy.yml'
      - '/templates/notify.yml'

build:
  extends: .docker-build
```

## CircleCI

### Orbs and Parallel Execution

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  node: circleci/node@5.2
  docker: circleci/docker@2.4
  slack: circleci/slack@4.12

executors:
  node-executor:
    docker:
      - image: cimg/node:22.12
    resource_class: medium

commands:
  setup-project:
    description: "Checkout and install dependencies"
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
          cache-path: node_modules

jobs:
  lint:
    executor: node-executor
    steps:
      - setup-project
      - run: npm run lint

  test:
    executor: node-executor
    parallelism: 4                       # Split tests across 4 containers
    steps:
      - setup-project
      - run:
          name: Run tests (split)
          command: |
            TEST_FILES=$(circleci tests glob "tests/**/*.test.ts" \
              | circleci tests split --split-by=timings)
            npm test -- $TEST_FILES
      - store_test_results:
          path: test-results/
      - store_artifacts:
          path: coverage/

  build-and-push:
    executor: docker/docker
    steps:
      - checkout
      - docker/build:
          image: my-app
          tag: ${CIRCLE_SHA1}
      - docker/push:
          image: my-app
          tag: ${CIRCLE_SHA1}

  deploy:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - run: ./scripts/deploy.sh

workflows:
  main:
    jobs:
      - lint
      - test
      - build-and-push:
          requires: [lint, test]
          filters:
            branches:
              only: [main]
      - hold-for-approval:
          type: approval                 # Manual gate
          requires: [build-and-push]
      - deploy:
          requires: [hold-for-approval]
      - slack/notify:
          event: fail
          channel: engineering
```

## Caching Strategies

### Dependency Cache

```yaml
# GitHub Actions: npm cache
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-

# GitHub Actions: pip cache
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-

# GitHub Actions: Go module cache
- uses: actions/cache@v4
  with:
    path: |
      ~/.cache/go-build
      ~/go/pkg/mod
    key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
```

### Build Cache

```yaml
# Cache compiled artifacts between runs
- uses: actions/cache@v4
  with:
    path: |
      .next/cache
      node_modules/.cache
    key: ${{ runner.os }}-build-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-build-

# Gradle build cache
- uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
```

### Docker Layer Cache

```yaml
# GitHub Actions: Docker layer caching
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
    cache-from: type=gha                     # GitHub Actions cache backend
    cache-to: type=gha,mode=max              # Export all layers

# Alternative: registry-based caching
- uses: docker/build-push-action@v5
  with:
    cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
    cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
```

## Branch Protection and Required Checks

### Required Status Checks Configuration

```yaml
# .github/workflows/required-checks.yml
# All jobs below should be configured as required status checks in:
# Settings > Branches > Branch protection rules > Require status checks to pass

name: Required Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  # Each job below becomes a required check
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npm test -- --coverage

  # Aggregate check: ensures all others pass (useful as single required check)
  all-checks-pass:
    needs: [lint, typecheck, test]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Verify all jobs passed
        run: |
          results=("${{ needs.lint.result }}" "${{ needs.typecheck.result }}" "${{ needs.test.result }}")
          for result in "${results[@]}"; do
            if [[ "$result" != "success" ]]; then
              echo "A required check failed: $result"
              exit 1
            fi
          done
          echo "All required checks passed"
```

## Workflow Specification

For writing formal, AI-optimized specifications for GitHub Actions workflows (documenting existing workflows, designing new ones, auditing for security and performance gaps), see [reference/github-actions-specification.md](reference/github-actions-specification.md).

## Anti-Patterns

```
# BAD: Secrets in workflow files or repository
# Use GitHub Secrets, environment secrets, or OIDC -- never hardcode

# BAD: No concurrency control
# Always add concurrency groups to prevent wasteful parallel runs on the same branch

# BAD: Running all jobs on every push regardless of changes
# Use path filters and conditional triggers in monorepos

# BAD: Skipping tests to speed up deployment
# Use matrix parallelism and caching instead of removing checks

# BAD: Using :latest tags for action versions
# Pin to specific versions (actions/checkout@v4) to prevent supply-chain attacks

# BAD: Single monolithic job doing lint, test, build, and deploy
# Split into focused jobs that can run in parallel and report independent status

# BAD: No artifact retention policy
# Set retention-days on artifacts to avoid storage bloat and cost

# BAD: Deploying without environment protection rules
# Use GitHub Environments with required reviewers for production
```

## Related Skills

- `csp-infrastructure-as-code` -- Terraform and Pulumi for provisioning deployment targets
- `csp-kubernetes-patterns` -- Deploying to Kubernetes clusters from CI/CD pipelines
- `csp-cloud-platform-patterns` -- Cloud-native deployment targets (ECS, Cloud Run, App Service)
- `csp-docker-patterns` -- Container image building and optimization for CI/CD
