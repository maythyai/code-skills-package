# CodeWiki Authoring Methodology

> Source-grounded authoring discipline. Generalized to git/github
> (`/blob/<commit>/<path>#Lx` citations; no platform knowledge-repo coupling).

## Authority and evidence

Treat **implementation + focused tests** across declared code inputs as authoritative for
*current behavior*. Use declared knowledge repos, READMEs, design docs, runbooks, history,
and existing wiki pages for terminology, product rules, discovery, and intent — attribute
those claims and verify current runtime behavior against code when possible.

When a knowledge dependency and the implementation disagree, **preserve the scoped
conflict** instead of silently choosing one. State narrow evidence limits instead of
converting inference into fact.

**Material claims** include: responsibilities, runtime behavior, relationships, control &
data flow, invariants, lifecycle ordering, persistence, configuration precedence,
failure/retry behavior, security boundaries, operations, extension seams. Ground them in
the **narrowest source spans and symbols actually inspected**. In the body, cite each
declared input file through a Markdown link whose target is the canonical
`/blob/<full-frozen-commit>/<repository-relative-path>` URL. Add `#Lx` or `#Lx-Ly` when a
stable narrow span supports the claim. **A bare `path:line` string is not an acceptable
citation** — readers cannot follow it directly.

## Information architecture

Organize around **stable systems, concepts, workflows, data ownership, and operational
tasks**. Do not mirror source directories or create pages that only narrate a file tree.
Every topic has **one canonical home**; other pages explain the relationship and link to it.

The route from an engineering question → owning page → entrypoints → symbols → focused
tests → narrow validation command should be **short**. Root indexes and tags are
navigation, not substantive coverage.

## One domain, one evidence pass

After final paths are frozen, assign a coherent logical domain **once**. The writer reads
the relevant evidence across repository boundaries (entrypoints, primary implementation,
important types/schemas, state/persistence, upstream caller, downstream dependency,
representative tests, knowledge rules, operational contract), then writes its full
disjoint page set in the same invocation. **Do not assign writers by repository** when one
runtime domain spans several repositories.

Do not commission a standalone research brief and then ask another writer to rediscover
the domain. Parent synthesis may use verified child summaries, but must inspect any
additional cross-domain evidence it states.

## Page design

Each factual page explains **one stable subject**: ownership, boundaries, mechanism,
relationships, invariants, failures, testing, extension points, where-to-change-it. Use
focused source maps and examples rather than exhaustive inventories. Preserve code
identifiers, paths, commands, and APIs when translation would reduce accuracy.

**Diagrams:** Mermaid sequence (runtime flows), state (lifecycles), flowchart (meaningful
branches), ER (data models). Every participant/state/edge must be supported by inspected
source. **A stale or invalid diagram is a content defect, not decoration to preserve.**

## Independent semantic verification (black-box)

Source-derived questions + wiki-only answers provide a black-box usefulness check:

- The **question finder** cannot read output wiki pages.
- The **answer verifier** cannot read source, tests, coverage plans, or source evidence
  included with the question.
- The verifier evaluates **unchanged acceptance criteria** and **never repairs** pages.
- The **main agent** owns evidence reconciliation and Markdown repairs.

This gate supplements (not replaces) coverage, link, grounding, and structural validation.

## Provenance contract (durable evidence)

- Code inputs: repository-root `derived_from` pinned to a frozen full commit.
- Knowledge dependencies: declared `depends_on` / `cites` / `derived_from` relation.
- Page-level `source_files` + input-matching relations whose `version` pins each frozen
  commit = the durable evidence contract.
