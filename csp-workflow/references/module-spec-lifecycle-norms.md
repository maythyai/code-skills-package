# Module Spec Lifecycle Behavioral Norms

> Shared reference for `csp-product-spec` (PMS), `csp-code-spec` (CMS), and
> `csp-test-spec` (TMS). Encodes the **Agent behavioral norms** — the standard
> and description each step of the code-production lifecycle must follow — and
> how the three Module Spec baselines interact at each stage.
>
> Read this BEFORE generating, aligning, or diffing any Module Spec. It is the
> "说明书 of 说明书": the governing standard that makes PMS/CMS/TMS trustworthy.

## 1. What a Module Spec Is (and Is Not)

A **Module Spec (说明书)** is a **living, versioned baseline document** for one
product / application / test surface. Unlike a one-shot artifact (a single PRD,
a single feature spec, a single test plan), a Module Spec:

- **Persists across iterations.** It is written once, then amended by deltas —
  never regenerated from scratch each cycle.
- **Is the source of truth.** Downstream skills *read from* it before producing
  their own artifacts, and *write back to* it when those artifacts ship.
- **Is auto-aligned, not hand-maintained.** Content is extracted from the
  codebase / requirement docs / test suite by scripts + Agent; the Agent never
  fabricates facts that the source does not support.
- **Governors quality, not content.** It defines the standard every downstream
  artifact must meet (coverage gates, naming, traceability, acceptance form),
  so it *determines the quality* of PRDs / specs / cases — it does not replace
  them.

| Spec | Scope | One per | Governs the quality of | Stored under |
|------|-------|---------|------------------------|-------------|
| **PMS** Product Module Spec | product | product / module family | PRDs, requirement decomposition | `.csp/product-spec/` |
| **CMS** Code Module Spec | application codebase | application / repo | design, task-split, code-gen, code review | `.csp/code-spec/{app}/` |
| **TMS** Test Module Spec | test surface (branch of PMS) | module / feature area | test cases (stock + incremental) | `.csp/test-spec/{module}/` |

**Platform note:** All platform integration is git + a generic remote
(`github.com` by default; override with `CSP_GIT_REMOTE`). No internal platform
names, domains, or APIs are referenced. Where a platform API would be needed
(meta fetch, diff extraction), the skill falls back to `git` operations
(`git log`, `git ls-files`, `git diff`, `grep`) so it works on any clone.

## 2. The Three-Spec Interaction Model

```
        ┌──────────────────────────┐
        │   PMS (product baseline)  │
        │   modules + boundaries +  │
        │   acceptance standards    │
        └───────────┬──────────────┘
                    │ governs
          ┌─────────┴─────────┐
          ▼                   ▼
   ┌──────────────┐   ┌──────────────┐
   │  CMS (code)  │   │  TMS (test)  │
   │  distilled   │   │  branch of   │
   │  from repo + │   │  PMS; stock  │
   │  aligned to  │   │  inventory + │
   │  design/spec │   │  incremental │
   └──────┬───────┘   └──────┬───────┘
          │                  │
          └────────┬─────────┘
                   ▼
        design / split / code-gen / CR / test
        all read the relevant Spec BEFORE acting
```

- **PMS → TMS:** TMS is a *branch* of PMS. The test surface inherits the
  product's module boundaries and acceptance criteria; it never invents
  modules PMS does not declare.
- **PMS ⇄ CMS:** When a new module is designed, CMS must be checked for
  existing entry points / conventions to reuse; when code ships, CMS is
  re-aligned so the next design round sees ground truth.
- **CMS → CR / code-gen:** Design, task-split, code generation, and code
  review all consume the CMS as the authoritative map of the codebase.
- **TMS → CR:** The "generate test cases" step of code review reads TMS for
  the stock baseline, then emits only the *incremental* cases the change
  requires.

## 3. Lifecycle Stages — Agent Behavioral Norms

For every stage: **目的 (Purpose)** · **行为准则 (Norms the Agent must follow)**
· **产物 (Artifacts)** · **门控 (Gate)** · **Spec 交互 (Which Spec reads/writes what)**.

### Stage 1 — 需求拆解 / Requirement Decomposition

- **目的:** Turn one input (idea, PRD, change request) into a falsifiable
  feature list with explicit boundaries.
- **行为准则:**
  1. Read PMS first. Decompose *within* the module boundaries PMS declares;
     do not invent modules.
  2. Every feature gets a falsifiable acceptance criterion (Given/When/Then).
     Vague "support X" without a pass/fail condition is rejected.
  3. Mark in-scope vs out-of-scope explicitly. Silence ≠ out-of-scope.
  4. One PRD entry may map 1:N / N:1 to features — state the cardinality.
- **产物:** `.csp/decomposition/FEATURE-DETAILS/*.yaml`, dependency graph.
- **门控:** ≥1 feature; every feature has AC; dependency graph is acyclic.
- **Spec 交互:** PMS read (boundaries); PMS write-back when a new module is
  approved (delta `## ADDED Module`).

### Stage 2 — 技术选型 / Tech Stack Selection

- **目的:** Pick language / framework / storage / infra per dimension, with
  recorded rationale.
- **行为准则:**
  1. Consult CMS for the codebase's *existing* stack and conventions. New
     choices must justify divergence from what CMS records.
  2. Each dimension → one ADR (Architecture Decision Record). ≥3 ADRs minimum
     (language, framework, database).
  3. Never leave a dimension "TBD" without a deferral date + owner.
- **产物:** `.csp/tech-decisions/` (overview + ADRs).
- **门控:** every dimension decided or deferred-with-date; stack consistency.
- **Spec 交互:** CMS read (existing stack); CMS write-back when stack changes.

### Stage 3 — 技术方案设计 / Technical Solution Design

- **目的:** Decide how to build: architecture, data model, interfaces, key
  technical risks.
- **行为准则:**
  1. Ground every design decision in CMS entry points / call chains — do not
     design against an imagined codebase.
  2. ≥2 alternatives compared for non-trivial decisions; record trade-offs.
  3. Identify the 1-3 hardest technical risks with a mitigation each.
- **产物:** `.csp/tech-design/` (architecture, data, interface, summary).
- **门控:** module/service split + global ER + data flow done; ≥1 alt
  compared per hard decision.
- **Spec 交互:** CMS read (call chains, conventions); PMS read (module
  boundaries) — design must not cross a PMS boundary without a recorded
  decision.

### Stage 4 — 方案评审 / Design Review

- **目的:** Independent review before locking the design.
- **行为准则:**
  1. Review against PMS (does design respect product boundaries?) and CMS
     (does design respect existing call chains / conventions?).
  2. Findings are severity-tagged (CRITICAL blocks ship). No CRITICAL may
     remain; WARNING ≤3 with documented rationale.
  3. Conclusion is one of: APPROVED / APPROVED_WITH_MINOR_CHANGES / REJECTED.
- **产物:** `.csp/tech-design/REVIEW-FINDINGS.md`.
- **门控:** zero CRITICAL; conclusion is APPROVED or APPROVED_WITH_MINOR.
- **Spec 交互:** PMS + CMS read; no write.

### Stage 5 — 全栈规格 / Full-Stack Spec Generation

- **目的:** Per-feature implementation-ready spec (UI, schema, API, backend,
  frontend, infra, test, security).
- **行为准则:**
  1. Every P0/P1 feature gets a full spec; P2 may use a concise spec — never
     *no* spec.
  2. API contract must be OpenAPI-grade; schema must be DDL-grade. Informal
     "returns some JSON" is rejected.
  3. Cross-reference the CMS entry points the feature touches — this is what
     makes the spec code-gen-ready.
- **产物:** `.csp/specs/SPEC-F-*.md`, `API-OVERVIEW.md`, `SPEC-INDEX.md`.
- **门控:** every P0/P1 feature has Schema + API + UI dimensions; API
  front/back consistent.
- **Spec 交互:** CMS read (entry points); TMS seed (the spec's test-strategy
  section seeds the TMS for this feature).

### Stage 6 — 任务拆解 / Task Breakdown

- **目的:** Ordered, dependency-acyclic, right-sized tasks from specs.
- **行为准则:**
  1. Each task ≤4h; each task references the spec section it implements.
  2. Group into waves by dependency; same-wave tasks are parallelizable.
  3. Every task links to ≥1 acceptance criterion (traceability).
- **产物:** `.csp/tasks/` (WBS, task cards, dependency DAG).
- **门控:** every feature has tasks; DAG acyclic; task granularity ≤4h.
- **Spec 交互:** PMS read (traceability origin); CMS read (files each task
  touches).

### Stage 7 — 实施规划 / Implementation Planning

- **目的:** Wave plan, milestones, parallel strategy.
- **行为准则:**
  1. Order waves so infra → data → backend → frontend → integration.
  2. Each milestone has a testable exit criterion (not "done").
  3. Plan parallel subagents only within a wave; never across a dependency.
- **产物:** `.csp/plan/IMPLEMENTATION-PLAN.md`.
- **门控:** plan covers all P0/P1 tasks; milestone exit criteria are
  machine-verifiable.
- **Spec 交互:** reads PMS + CMS + TMS to size effort and coverage.

### Stage 8 — 并行开发 / Parallel Execution

- **目的:** Implement tasks, one atomic commit per task.
- **行为准则:**
  1. Each task follows its spec section; deviations are recorded as a
     design-note, not silent.
  2. One task = one commit (atomic, reviewable, revertible).
  3. Code-gen must read the CMS so generated code matches existing patterns
     (naming, layering, error handling).
  4. Worktree isolation when agents mutate files in parallel.
- **产物:** code changes (commits), per-task summary.
- **门控:** all tasks complete; build passes.
- **Spec 交互:** CMS read (patterns); TMS read (existing cases to extend);
  on ship, CMS + TMS write-back (delta).

### Stage 9 — 质量门控 / Quality Gate

- **目的:** Automated gates before review.
- **行为准则:**
  1. Tests pass at every layer the TMS prescribes for this module.
  2. Lint / typecheck zero warnings; no CRITICAL security findings.
  3. Coverage is checked against TMS *requirements-traceability*, not just a
     percentage — an uncovered requirement fails the gate even at 100%.
- **产物:** test results, lint/typecheck report, security scan.
- **门控:** all CRITICAL tests pass; TMS requirement-coverage gap = 0.
- **Spec 交互:** TMS read (which methods each requirement needs).

### Stage 10 — 审查验证 / Review & Validation

- **目的:** Spec-aligned code review + three-dimension verification.
- **行为准则:**
  1. Code review consumes CMS as the call-chain map; every finding cites
     `file:line`. No "the code looks off" without a location.
  2. Three-dimension verification: completeness (every requirement + task),
     correctness (impl matches spec intent), coherence (one pattern per
     concern).
  3. The CR's "generate test cases" step reads TMS stock baseline and emits
     only incremental cases (matrix of entry × state the change newly
    触及).
- **产物:** review report, `VERIFICATION.md`.
- **门控:** zero CRITICAL; spec alignment ≥90%.
- **Spec 交互:** CMS read (call chains); TMS read (stock) + write
  (incremental cases).

### Stage 11 — 发布交付 / Ship & Deliver

- **目的:** Tag, changelog, release, deploy.
- **行为准则:**
  1. Every shipped acceptance criterion is traceable to a PMS requirement
     (closed loop).
  2. `CHANGELOG.md` updated; release notes reference the PMS/TMS deltas.
  3. Tag is immutable; deploy is reproducible from the tag.
- **产物:** git tag, changelog, release notes, deployment.
- **门控:** PMS requirement-coverage = 100% for in-scope; TMS gate green.
- **Spec 交互:** PMS read (close the loop); fold deltas into canonical PMS/
  TMS during archive.

### Stage 12 — 运维监控 / Post-Launch

- **目的:** Monitor, alert, learn for the next iteration.
- **行为准则:**
  1. Smoke + sanity after deploy (smoke = alive + critical path; sanity = the
     one thing just changed).
  2. Production incidents feed back as TMS regression cases + PMS risk entries.
  3. Capture lessons into `.csp/intel/` for cross-session reuse.
- **产物:** monitoring config, alert rules, known-issues, next-iteration
  backlog.
- **门控:** smoke green on critical paths.
- **Spec 交互:** TMS write (regression cases from incidents); PMS write
  (risk entries).

### Stage 13 — 变更与迭代 / Change & Iteration (cross-cutting)

- **目的:** Evolve the product without re-doing everything from scratch.
- **行为准则:**
  1. Changes are deltas against PMS (`## ADDED / MODIFIED / REMOVED Module`).
     Never rewrite PMS wholesale.
  2. Run change-impact analysis (PRD → Feature → Spec → Task → Code) *before*
     accepting the change, not after.
  3. Re-align CMS after code ships so the next iteration sees ground truth.
  4. TMS incremental cases = the diff between current stock and the new
     requirement matrix.
- **门控:** impact quantified (hours + affected modules) before decision.
- **Spec 交互:** all three read + written as deltas.

## 4. Cross-Cutting Norms (apply to every stage)

1. **No fabrication.** Any datum the source does not support is marked
   `[TBD]` with a deferral, never invented. This is the single most important
   norm — a Module Spec that hallucinates is worse than none.
2. **file:line provenance.** Every claim in CMS and every finding in CR cites
   a concrete location. Verbal claims are rejected.
3. **Delta discipline.** A Module Spec is amended by deltas (ADDED/MODIFIED/
   REMOVED), then folded into the canonical baseline at milestone archive.
   MODIFIED sections paste the *full* original before editing.
4. **Traceability is mandatory, not ceremonial.** Every requirement →
   feature → spec → task → code → test link is explicit. A green test suite
   with an unmapped requirement is a *failure*, not a success.
5. **Gate before advance.** A stage's gate must pass (or be explicitly
   waived with recorded rationale) before the next stage begins. Silent
   skip is forbidden.
6. **Generalize, don't port.** No internal platform names, domains, or
   proprietary APIs. Platform coupling is git + a configurable remote
   (`CSP_GIT_REMOTE`, default `github.com`).
7. **Size to scale.** A trivial change uses the delta path, not the full
   lifecycle. Scale *down*, never *skip* — even a 1-feature module benefits
   from a one-paragraph spec stub.

## 5. Module Spec Quality Self-Check

After generating or aligning any Module Spec, verify:

| # | Check | Pass criterion |
|---|-------|----------------|
| 1 | No fabrication | Every fact traces to code/doc/test source or is `[TBD]` |
| 2 | Delta discipline | Changes are ADDED/MODIFIED/REMOVED, not wholesale rewrite |
| 3 | Traceability | Every module/requirement/case links to upstream/downstream |
| 4 | Provenance | CMS claims cite `file:line`; PMS claims cite requirement IDs |
| 5 | Boundary integrity | No module crosses a PMS boundary without a recorded decision |
| 6 | Acceptance falsifiable | Every AC is Given/When/Then, pass/fail, not subjective |
| 7 | Gate-able | Spec defines the gate, not just the content |
| 8 | Platform-neutral | No internal domains; git + configurable remote only |
| 9 | Current | Re-aligned after last ship (CMS) / last requirement change (PMS) / last incident (TMS) |
| 10 | Idempotent | Re-running alignment on an unchanged source produces zero delta |

## 6. Relationship to Existing CSP Skills

| Existing skill | Role | Module Spec interaction |
|----------------|------|--------------------------|
| `csp-prd-generation` | generate one PRD | reads PMS as the quality baseline |
| `csp-prd-parser` | parse a PRD to PRD-IR | feeds PMS when a new module surfaces |
| `csp-prd-traceability` | build RTM | PMS is the RTM's module layer |
| `csp-prd-change-impact` | assess change | diffs against PMS + TMS baselines |
| `csp-fullstack-spec-generator` | per-feature spec | reads CMS for entry points; seeds TMS |
| `csp-tech-task-breakdown` | tasks | reads CMS for files touched |
| `csp-code-review` / `csp-qa-cr-review` | CR | CMS = call-chain map; TMS = stock baseline for incremental cases |
| `csp-test-methodology` | pick methods | TMS prescribes which methods per requirement |
| `csp-qa-test-engineering` | generate cases | TMS = stock inventory; emits incremental diff |
| `csp-lifecycle-orchestrator` | orchestrate S1-S9 | PMS/CMS/TMS run as the governance track alongside S1-S9 |

## 7. File Layout (project-native, `.csp/`-rooted)

```
.csp/
├── product-spec/                 # PMS
│   ├── PRODUCT-MODULE-SPEC.md    # canonical baseline
│   ├── modules/{MODULE}.md        # per-module definition
│   └── deltas/                   # ADDED/MODIFIED/REMOVED before fold
├── code-spec/{app}/              # CMS, one per application/repo
│   ├── CODE-MODULE-SPEC.md       # canonical baseline
│   ├── knowledge-graph.json      # entry points + call chains
│   ├── entry-points.jsonl
│   └── deltas/
├── test-spec/{module}/           # TMS, branch of PMS
│   ├── TEST-MODULE-SPEC.md       # canonical baseline
│   ├── case-inventory.md         # stock cases
│   ├── requirement-matrix.md     # requirement → method mapping
│   └── deltas/
└── intel/                        # cross-session learning (existing)
```

All paths are relative to the project root and parameterized via `CSP_PROJECT_ROOT`
(default: cwd). Nothing is hardcoded to a user home directory or port.
