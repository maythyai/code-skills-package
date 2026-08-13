---
name: csp-prd-generation
description: >
  Generate a reviewable Product Requirements Document from feature descriptions.
  Branches by product type (B2C/B2B/internal-tool/platform) with type-specific emphasis.
  Use when the user says "write PRD", "product requirements", "feature spec",
  "需求文档", "产品需求", "功能文档", "写需求", "PRD模板", "feature spec",
  "产品需求文档", "功能规格", "需求规格说明", "出需求文档".
version: "1.0.0"
layer: 2
category: workflow
phase: define
domain: architecture
scope: design
tools: [Read, Write, Edit, Glob, Grep, Bash]

dependencies:
  skills: []

related_skills:
  - csp-requirement-decomposition
  - csp-user-story-decomposition
  - csp-competitive-analysis
  - csp-requirement-prioritization
  - csp-mvp-scoping
  - csp-brainstorming
  - csp-product-discovery-orchestrator

anti_rationalizations:
  "PRD doesn't need to be detailed": "Vague PRDs create vague implementations. Detail prevents rework."
  "I'll skip the background section": "Without 'why', the team cannot make trade-off decisions."
  "Technical implementation belongs in PRD": "PRD describes WHAT, not HOW. Implementation is engineering's decision."
  "One user persona covers everyone": "If you can't name the user, you don't know the user."

triggers:
  keywords: ["PRD", "产品需求", "需求文档", "功能文档", "feature spec", "产品需求文档",
             "功能规格", "需求规格说明", "写需求", "出需求文档", "write PRD", "product requirements"]
  intents:
    - "user wants to write a product requirements document"
    - "user has a feature idea and needs structured documentation"
    - "user needs to hand off requirements to engineering"
  context:
    - "after_brainstorming"
    - "after_requirement_decomposition"
---

# PRD Generation

Generate a structured, review-ready Product Requirements Document (PRD) from feature descriptions.
The output is differentiated by product type (B2C / B2B / internal tool / platform), with each
type emphasizing different modules. Includes a 10-point quality self-check to ensure completeness.

## When to Use

- The user provides a feature description and wants a formal requirements document
- The team needs to align on what to build before engineering starts
- A stakeholder requests a written spec for review or approval
- After brainstorming or requirement decomposition, the output needs to be formalized

## When NOT to Use

- The user only has a vague idea with no feature description yet (use `csp-brainstorming` first)
- The goal is technical architecture design (use `csp-fullstack-spec-generator` instead)
- The user needs to decompose requirements into features (use `csp-requirement-decomposition` first)
- The product is already in development and only needs a minor tweak (write a change request instead)

## Process

### Step 1: Parse Input and Determine Product Type

Collect the following from the user. Mark missing optional fields as `[TBD]`:

| Field | Required | Notes |
|-------|----------|-------|
| Feature description | Yes | At minimum one sentence describing what to build and what problem it solves |
| Target users | No | Infer from feature description if not provided |
| Business objectives | No | Expected metrics impact (DAU, conversion, revenue, etc.) |
| Product type | No | B2C / B2B / internal-tool / platform; auto-infer if not specified |
| Constraints | No | Technical limitations, timeline, resource constraints |
| PRD depth | No | Summary (for review) or detailed (for engineering); default: detailed |

**Auto-inference rules for product type:**
- Contains "user/member/points/mall/consumer" -> B2C
- Contains "enterprise/SaaS/CRM/admin/console" -> B2B
- Contains "internal/management system/ticket/ops" -> internal-tool
- Contains "platform/marketplace/matching/bilateral" -> platform

**Input sufficiency routing:**
- User only says "write a PRD" with no feature description -> enter **Guided Mode**: ask for feature description with examples
- User provides feature description + target users + business objectives -> enter **Fast Mode**: generate directly
- Requirement is too large for one PRD -> suggest splitting into multiple PRDs, confirm MVP scope first

### Step 2: Apply Product-Type Branching

Different product types emphasize different PRD modules. Apply the following emphasis:

| Product Type | Emphasis Modules | Key Differentiators |
|-------------|-----------------|---------------------|
| **B2C** | User journey, growth metrics, A/B test plan | Heavy on interaction design, data tracking, user journey mapping |
| **B2B** | Permission model, multi-tenancy, SLA, integration interfaces | Heavy on feature completeness, security compliance, API integration specs |
| **Internal Tool** | Operational efficiency, system integration, training cost | Heavy on practical workflows, light on visual design, detailed operation procedures |
| **Platform** | Multi-role interaction, supply-demand matching, ecosystem rules | Heavy on role-specific views, rule engine design, each stakeholder's perspective |

**B2B products must additionally cover:**
- Permission matrix (role x feature x data scope)
- Multi-tenant data isolation approach description
- Integration interface list with customer existing systems

**Platform products must additionally cover:**
- Independent feature view per role (supplier / consumer / platform operator)
- Supply-demand matching rules and ranking strategy
- Platform commission / settlement rules

### Step 3: Structured Requirement Decomposition

Decompose the feature into modules using three methods in combination:

1. **User Journey Method**: Map the user's complete path from entry to goal completion. Each node becomes a feature point.
2. **Role Split Method**: List all involved roles (end user, admin, operator, etc.). Each role's operations become a feature module.
3. **CRUD Method**: For core data objects, enumerate Create / Read / Update / Delete operations.

For each feature module, fill in:
- **Feature description**: One sentence on what it does
- **User story**: As a [role], I want [action], so that [value]
- **Business rules**: Exhaustive enumeration of all rules, no vague "etc." or "other cases"
- **Interaction flow**: Entry -> Steps -> Success feedback -> Failure handling
- **Exception handling**: Network timeout, data anomaly, insufficient permissions, and other edge cases

### Step 4: Generate the Complete PRD

Output the PRD using the following 8-section structure. Save to `docs/prd/PRD-{feature-name}.md`.

```markdown
# PRD: {Feature Name}

**Version**: v1.0
**Author**: {name or [TBD]}
**Date**: {current date}
**Status**: Draft

---

## 1. Background and Objectives

### 1.1 Background
Answer three questions: Why now? What happens if we don't? What happens if we do?

### 1.2 Target Users
| User Role | Characteristics | Core Need | Usage Scenario |
|-----------|----------------|-----------|----------------|

### 1.3 Business Objectives and Success Metrics
Every objective must be SMART: specific number + deadline.
| Objective | Metric | Target Value | Monitoring Method |
|-----------|--------|-------------|-------------------|

## 2. Requirement Summary
One paragraph, under 30 words, capturing the core requirement.

## 3. Detailed Feature Design

### 3.1 {Feature Module}
**Description**: {what it does}
**User Story**: As a {role}, I want {action}, so that {value}
**Priority**: P0 (must ship) / P1 (strongly recommended) / P2 (nice to have)

**Business Rules**:
1. {Rule with trigger condition and processing logic}
2. {Rule}

**Interaction Flow**:
1. User enters from {entry point}
2. {Operation steps}
3. Success: {feedback}
4. Failure: {error message and handling}

**Exception Handling**:
| Exception Scenario | Handling | User Message |
|-------------------|----------|-------------|

## 4. Non-Functional Requirements
B2C emphasizes performance and UX; B2B emphasizes security and availability.
| Category | Requirement | Acceptance Criteria |
|----------|-------------|-------------------|
| Performance | e.g. page load time | e.g. < 2 seconds |
| Security | e.g. data encryption | e.g. TLS 1.2+ in transit |
| Compatibility | e.g. browser/device | e.g. Chrome/Safari/WeChat browser |

## 5. Data Requirements (Tracking/Events)
| Event Name | Trigger Condition | Key Properties | Purpose |
|-----------|-------------------|---------------|---------|

## 6. Acceptance Criteria
Each feature module needs at least 3 ACs in Given-When-Then format.
| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|

## 7. Timeline Estimate
| Phase | Estimated Effort | Dependencies | Risks |
|-------|-----------------|-------------|-------|
Split into: development / testing / integration / launch.

## 8. Risks and Dependencies
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|

## Appendix
- Related document links
- Competitive references
- Design mockup links
```

### Step 5: PRD Quality Self-Check

After generation, verify each item in the checklist. Mark failing items and provide fix suggestions:

| # | Check Item | Pass Criteria |
|---|-----------|--------------|
| 1 | Background is not vague | Answers "why build this", not just "we need this" |
| 2 | Objectives are quantifiable | At least one numeric success metric |
| 3 | User personas are specific | No "all users" generalizations |
| 4 | Business rules are exhaustive | No "etc." or "other cases" vague expressions |
| 5 | Exception flows are covered | Each feature covers at least 2 exception scenarios |
| 6 | Acceptance criteria are testable | Uses Given-When-Then format |
| 7 | Data tracking is complete | Core operation paths all have tracking events |
| 8 | No technical implementation | PRD describes WHAT, not HOW (no DB type, language, framework) |
| 9 | Priorities are explicit | Feature modules are tagged P0/P1/P2 |
| 10 | Timeline is grounded | Effort estimates cover dev/test/integration phases |

## Key Principles

- **PRD does not specify technical implementation**: Never name database types, programming languages, or framework choices. Only describe performance requirements (e.g., "< 2 seconds").
- **PRD does not replace design mockups**: Describe information hierarchy and interaction logic only. Leave colors, fonts, and layout to designers.
- **Never fabricate data**: Business data not provided by the user (DAU, conversion rates, etc.) must be marked `[TBD]`.
- **Never omit role perspectives**: For multi-role features, cover every role's viewpoint.

## Anti-Patterns

| Anti-Pattern | Symptom | Correct Approach |
|-------------|---------|-----------------|
| Requirement gold-plating | 50 feature points in v1 | Split into MVP / V1.1 / V2; v1 focuses on 3-5 core features |
| Pseudo-requirement | "Users might need..." without data or research support | Tag requirement source: user feedback / data analysis / competitive reference / business judgment |
| Interaction overreach | PRD specifies button color, font size, layout | Only describe information hierarchy and interaction logic |
| Technical overreach | PRD specifies Redis, MySQL, React | Only describe performance requirements |
| Rule black hole | "Handle per business rules" without specifying rules | Enumerate every rule's trigger condition, processing logic, and boundary values |

## Related Skills

- [[csp-requirement-decomposition]] - decompose requirements into features before writing PRD
- [[csp-user-story-decomposition]] - break PRD into executable user stories after approval
- [[csp-competitive-analysis]] - research competitors before writing PRD for feature reference
- [[csp-requirement-prioritization]] - prioritize multiple requirements before PRD scoping
- [[csp-mvp-scoping]] - define MVP scope when requirements are too large for one PRD
- [[csp-brainstorming]] - generate creative solutions before formalizing into PRD
