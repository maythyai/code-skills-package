---
name: csp-tech-diagram
description: >-
  Use when the user asks to create, visualize, or animate a technical diagram —
  software architecture, data flow, flowcharts, sequence diagrams, C4 models,
  cloud deployments, event streams, observability traces, agent/memory systems,
  UML, ER, network topology, timelines, or technical concept maps. Produces
  geometry-checked SVG, high-resolution PNG, validated semantic SVG-to-GIF
  motion, and offline interactive HTML. Integrates with doc-lifecycle for
  version-controlled diagram assets and doc-insight for extracting structure
  from technical documents before visualization.
version: 1.0.0
layer: 4
category: patterns
phase: build
domain: architecture
role: specialist
scope: design
tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Agent
triggers:
  - 画架构图
  - 画流程图
  - 画序列图
  - 画技术图
  - 技术架构图
  - 数据流图
  - 系统架构
  - diagram
  - architecture diagram
  - flowchart
  - sequence diagram
  - tech graph
  - 生成 GIF
  - animate diagram
  - 让图动起来
related_skills:
  - csp-frontend-slides
  - csp-visual-verdict
  - csp-graph-architecture
anti_rationalizations:
  - Never skip geometry validation — syntactic SVG validity does not guarantee visual correctness
  - Never hardcode node positions without checking for collisions
  - Never claim visual review passed without actually reading the PNG
---

# CSP Tech Diagram

Generate geometry-checked SVG technical diagrams, high-resolution PNG, validated SVG-to-GIF semantic motion, and sanitized offline interactive HTML from natural language descriptions.

## When to Use

- User asks to visualize a system, architecture, data flow, or engineering concept
- User requests a specific diagram type: architecture, flowchart, sequence, C4, cloud deployment, event stream, ops/observability, agent/memory, UML (class/use-case/state-machine), ER, network topology, timeline, mind map, comparison matrix
- User says "画架构图", "画流程图", "diagram", "visualize this system", "生成 GIF", "让图动起来"
- User provides a technical document and asks to "illustrate the architecture" or "show the data flow"
- User wants to embed a diagram into project documentation (triggers doc-lifecycle integration)

## When NOT to Use

- Photos, raster artwork, or illustrations (use image generation tools)
- Quantitative data charts with axes/scales (use csp-frontend-slides or a charting library)
- UI wireframes or mockups (use html-prototype or frontend-design skills)
- Simple ASCII diagrams sufficient for inline code comments

## Process

### Phase 0: Context Gathering (Doc-Insight Integration)

When the user provides a technical document, README, PRD, or codebase as input:

1. Read the source material thoroughly
2. Extract: system boundaries, components/services, data flows, dependencies, deployment targets
3. Identify the diagram type that best communicates the extracted structure
4. If the source is a project with `DOC-STATUS.md` (doc-lifecycle managed), check for existing diagrams and their status — avoid duplicating a `completed` diagram; offer to update a `partial` or `deprecated` one

### Phase 1: Classify & Extract

1. **Classify** the diagram type from user intent (see Diagram Types below)
2. **Extract structure** — identify layers, nodes, edges, flows, and semantic groups
3. **Plan layout** — read `$SKILL_ROOT/references/composition-quality-contract.md`, apply diagram-type layout rules
4. **Load style reference** — default to `$SKILL_ROOT/references/style-1-flat-icon.md`; load matching `$SKILL_ROOT/references/style-N-*.md` for user-specified styles
5. **Select semantic contract** — Styles 9–12 enforce domain contracts (C4/Cloud/Event/Ops); validate with `fireworks.py validate` before layout

### Phase 2: Generate SVG

6. **Map nodes to shapes** — use Shape Vocabulary below
7. **Check icon needs** — read `$SKILL_ROOT/references/icons.md` for known product icons
8. **Build diagram JSON** conforming to `$SKILL_ROOT/schemas/diagram-v1.schema.json`
9. **Render** via the deterministic engine:

```bash
SKILL_ROOT="<absolute-path-to-this-skill-directory>"
mkdir -p ./output
python3 "$SKILL_ROOT/scripts/fireworks.py" render <mode> '<json>' ./output/diagram.svg
```

Or for template-based generation:
```bash
python3 "$SKILL_ROOT/scripts/generate-from-template.py" <template-name> ./output/diagram.svg '<json>'
```

Available templates: `architecture`, `flowchart`, `sequence`, `data-flow`, `state-machine`, `timeline`, `er-diagram`, `agent-architecture`, `comparison-matrix`, `use-case`

### Phase 3: Validate (Never Skip)

10. **Structural validation**:
```bash
python3 "$SKILL_ROOT/scripts/fireworks.py" check ./output/diagram.svg
```
This runs XML, markers, geometry (collisions, crossings, overlaps, orthogonality), and composition budget checks.

11. **Fix violations** — if validation reports issues, adjust the JSON (node positions, arrow ports, corridors) and re-render. Max 2 correction cycles.

### Phase 4: Export

12. **PNG export** (default):
```bash
python3 -c "import cairosvg; cairosvg.svg2png(url='./output/diagram.svg', write_to='./output/diagram.png', output_width=1920)"
```
Fallback: `python3 "$SKILL_ROOT/scripts/svg2png.js"` via Node/Puppeteer.

13. **Interactive HTML** (on request or for documentation embedding):
```bash
python3 "$SKILL_ROOT/scripts/fireworks.py" export-html ./output/diagram.svg ./output/diagram.html
```
Produces a self-contained offline viewer with pan/zoom, light/dark theme, multi-format export, and full SVG sanitization.

14. **Semantic GIF animation** (on request: "生成 GIF" / "animate" / "让图动起来"):
```bash
python3 "$SKILL_ROOT/scripts/fireworks.py" animate ./output/diagram.svg ./output/diagram.gif
```
Requires Node.js 18+ with puppeteer-core and FFmpeg. Default: 960px wide, 5.75s, 20fps. The animation draws connectors in semantic order (system initialization) then shows settled directional flow (steady-state operation).

### Phase 5: Visual Review Gate

15. **Read the exported PNG** using the Read tool (multimodal image viewing). Inspect for:
    - Arrows crossing through component interiors
    - Labels colliding with lifelines, other labels, or arrows
    - Boxes overlapping
    - Legend covering content
    - Clipped elements near viewBox edges
16. If issues found: revise JSON, re-render, re-validate. Max 2 focused correction passes.
17. Report `visual_review: passed` or `visual_review: skipped (image reader unavailable)`.

### Phase 6: Doc-Lifecycle Integration

When the diagram is part of a managed documentation set:

18. **Register in DOC-STATUS.md** — add entry with `status: completed`, diagram type, and file path
19. **Add frontmatter to companion docs** — if the diagram illustrates a specific document, add a cross-reference
20. **Version control** — commit SVG source (not just PNG) so diagrams are diffable and regenerable
21. **Staleness tracking** — when the underlying system changes, doc-lifecycle marks the diagram `deprecated` or `partial`, triggering a re-generation pass

Recommended project structure for diagram assets:
```
docs/
├── diagrams/
│   ├── architecture.svg          # Source (version-controlled)
│   ├── architecture.png          # Rendered (for quick viewing)
│   ├── architecture.html         # Interactive (for presentations)
│   └── architecture.gif          # Animated (for demos)
├── DOC-STATUS.md                 # Lifecycle tracker
└── architecture.md               # Companion doc referencing the diagram
```

## Diagram Types & Layout Rules

### Architecture Diagram
Nodes = services/components. Group into horizontal layers (top→bottom or left→right).
- Typical layers: Client → Gateway/LB → Services → Data/Storage
- Use dashed containers to group related services in the same layer
- Arrow direction follows data/request flow
- ViewBox: `0 0 960 600` standard, `0 0 960 800` for tall stacks

### Data Flow Diagram
Emphasizes what data moves where. Focus on data transformation.
- Label every arrow with the data type (e.g., "embeddings", "query", "context")
- Use wider arrows (stroke-width: 2.5) for primary data paths
- Dashed arrows for control/trigger flows
- Color arrows by data category

### Flowchart / Process Flow
Sequential decision/process steps.
- Top-to-bottom preferred; left-to-right for wide flows
- Diamond for decisions, rounded rects for processes, parallelograms for I/O
- Keep node labels short (≤3 words); detail in sub-labels
- Align nodes on grid: x snap to 120px intervals, y to 80px

### Agent Architecture Diagram
Shows how an AI agent reasons, uses tools, and manages memory.
- Input layer → Agent core (LLM, reasoning loop) → Memory layer → Tool layer → Output layer
- Use cyclic arrows for iterative reasoning
- Separate memory types visually (short-term dashed, long-term cylinder)

### Sequence Diagram
Time-ordered message exchanges between participants.
- Participants as vertical lifelines (top labels + vertical dashed lines)
- Messages as horizontal arrows, top-to-bottom time order
- Activation boxes show active processing
- Group with loop/alt frames
- ViewBox height = 80 + (num_messages × 50)

### C4 Review Canvas (Style 9)
Enforces one abstraction level per diagram. Validates: level consistency, boundary containment (20px inset), protocol on every edge.

### Cloud Fabric (Style 10)
Region/network/workload deployment. Validates: icon manifest, region boundaries, nesting depth ≤4, 16px sibling clearance, cross-boundary `via` requirement.

### Event Transit (Style 11)
Topics, processors, consumer groups as a metro map. Validates: topic rails ≤4, station ordering, rail alignment, 64px rail clearance.

### Ops Pulse (Style 12)
Golden signals, critical paths, correlated traces. Validates: exactly 4 golden signals per service, observation window consistency, critical path continuity.

### Additional Types
- **Comparison Matrix**: Column headers = systems, rows = attributes, max 5 columns
- **Timeline / Gantt**: Horizontal time axis, bars colored by category, milestone diamonds
- **Mind Map**: Radial from center, cubic bezier branches, 360/N degree distribution
- **Class Diagram (UML)**: 3-compartment rects, visibility notation, relationship arrows
- **Use Case (UML)**: Stick figures + ellipses + system boundary + include/extend
- **State Machine**: Rounded rects + initial/final states + guard conditions
- **ER Diagram**: Entity rects with PK/FK, relationship diamonds, cardinality labels
- **Network Topology**: Tiered devices (Internet → Edge → Core → Access → Endpoints)

## Shape Vocabulary

| Concept | Shape | Notes |
|---------|-------|-------|
| User / Human | Circle + body path | Stick figure or avatar |
| LLM / Model | Rounded rect with gradient fill | Use accent color |
| Agent / Orchestrator | Hexagon or double-border rect | Signals "active controller" |
| Memory (short-term) | Rounded rect, dashed border | Ephemeral = dashed |
| Memory (long-term) | Cylinder (database shape) | Persistent = solid |
| Vector Store | Cylinder with grid lines | Add 3 horizontal lines |
| Tool / Function | Rect with wrench icon | |
| API / Gateway | Hexagon (single border) | |
| Queue / Stream | Horizontal tube (pipe shape) | |
| File / Document | Folded-corner rect | |
| Browser / UI | Rect with 3-dot titlebar | |
| Decision | Diamond | Flowcharts only |
| Process / Step | Rounded rect | Standard box |
| External Service | Dashed border rect | |
| Data / Artifact | Parallelogram | I/O in flowcharts |

## Arrow Semantics

| Flow Type | Color | Stroke | Dash | Meaning |
|-----------|-------|--------|------|---------|
| Primary data flow | `#2563eb` | 2px solid | none | Main request/response |
| Control / trigger | `#ea580c` | 1.5px solid | none | System triggering another |
| Memory read | `#059669` | 1.5px solid | none | Retrieval from store |
| Memory write | `#059669` | 1.5px | `5,3` | Write/store operation |
| Async / event | `#6b7280` | 1.5px | `4,2` | Non-blocking, event-driven |
| Embedding / transform | `#7c3aed` | 1px solid | none | Data transformation |
| Feedback / loop | `#7c3aed` | 1.5px curved | none | Iterative reasoning |

Always include a legend when 2+ arrow types are used.

## Styles

| # | Name | Background | Best For |
|---|------|-----------|----------|
| 1 | Flat Icon (default) | White | Blogs, docs, presentations |
| 2 | Dark Terminal | `#0f0f1a` | GitHub, dev articles |
| 3 | Blueprint | `#0a1628` | Architecture docs |
| 4 | Notion Clean | White, minimal | Notion, Confluence, wikis |
| 5 | Glassmorphism | Dark gradient | Product sites, keynotes |
| 6 | Claude Official | Warm cream `#f8f6f3` | Anthropic-style diagrams |
| 7 | OpenAI Official | Pure white | OpenAI-style diagrams |
| 8 | Dark Luxury (AI-authored) | `#0a0a0a` | Premium editorial — hand-craft from style-8 reference |
| 9 | C4 Review Canvas | Warm paper `#f7f2e8` | C4 reviews and ADRs |
| 10 | Cloud Fabric | Cloud blue `#edf5fb` | Multi-region deployments |
| 11 | Event Transit | Transit paper `#fbf7ee` | Event streams, topics |
| 12 | Ops Pulse | Ops navy `#07111f` | Golden signals, traces |

Style selection fingerprints: `C4评审` → 9; `云部署/deployment topology` → 10; `事件流/event metro` → 11; `可靠性/golden signals` → 12; default → 1.

## Rule Precedence

1. User's explicit content and style request
2. Selected style reference tokens (palette, typography, radius, shadow)
3. Diagram-type layout rules and semantic flow requirements
4. Universal defaults

Geometry and validation gates always remain active regardless of style.

## Layout & Validation Rules

**Spacing**: Same-layer nodes 80px horizontal, 120px vertical between layers. Canvas margins 40px min. Snap to 8px grid.

**Arrow Routing**: Prefer orthogonal paths. Anchor on component edges, not centers. Route around dense clusters. Jump-over arcs (5px radius) for unavoidable crossings.

**Arrow Labels**: Offset-first (6-8px from line). Background rect fallback only when offset still crosses another element. ≤3 words, stagger 15-20px when converging.

**Validation Checklist** (automated by `fireworks.py check`):
1. Arrow-Component Collision: arrows must not pass through component interiors
2. Text Overflow: all text fits with 8px padding
3. Marker Integrity: every marker URL resolves to a definition
4. Edge Orthogonality: all route segments axis-aligned
5. Edge-Edge Crossings: only at declared bridge points
6. Label-Obstacle: labels don't overlap nodes, edges, or other labels
7. Canvas Containment: all elements within viewBox
8. Composition Budget: bends, stretch, gaps within profile limits

## SVG Technical Rules

- ViewBox: `0 0 960 600` default; `0 0 960 800` tall; `0 0 1200 600` wide
- Fonts: embed via `<style>` — no external @import (cairosvg cannot fetch URLs)
- Text: minimum 12px, prefer 13-14px labels, 16-18px titles
- Z-order: background → containers → arrows → nodes → text → legends
- All arrows use `<marker>` with markerEnd

## Key Principles

1. **Deterministic rendering** — same JSON input always produces identical SVG; the LLM extracts structure, the engine renders
2. **Validation is non-negotiable** — never deliver an SVG that fails geometry checks
3. **Semantic motion over decoration** — GIF animation communicates system initialization and data flow direction, not visual flair
4. **Source-controlled diagrams** — SVG is the source of truth; PNG/GIF/HTML are derived artifacts
5. **Document lifecycle awareness** — diagrams are living assets that go stale; integrate with doc-lifecycle for staleness tracking

## Examples

### Example 1: Microservice Architecture
User: "画一个电商系统的架构图，包含前端、API网关、用户服务、订单服务、支付服务和数据库"

→ Classify: Architecture Diagram
→ Style: 1 (Flat Icon, default)
→ Extract: 6 nodes in 4 layers (Client → Gateway → Services×3 → Data)
→ Render via `generate-from-template.py architecture`
→ Validate → PNG → Visual review

### Example 2: Animated Data Flow
User: "把这个 RAG pipeline 画出来，然后生成 GIF"

→ Classify: Data Flow Diagram
→ Style: 2 (Dark Terminal, good for data flows)
→ Extract: Query → Embed → VectorSearch → Retrieve → Augment → LLM → Response
→ Render → Validate → PNG → GIF (semantic draw-on + settled flow)

### Example 3: From Document to Diagram (Doc-Insight Integration)
User: "读一下 docs/architecture.md，帮我画出系统架构"

→ Phase 0: Read docs/architecture.md, extract components and flows
→ Check DOC-STATUS.md for existing diagram status
→ Classify → Extract → Render → Validate → Export
→ Register new diagram in DOC-STATUS.md

## Dependencies

| Capability | Required | Notes |
|-----------|----------|-------|
| SVG generation + validation | Python 3.9+ (stdlib only) | Zero external deps |
| PNG export | `cairosvg` (pip install cairosvg) | Or rsvg-convert / Puppeteer fallback |
| Interactive HTML | Python 3.9+ (stdlib only) | Zero external deps |
| GIF animation | Node.js 18+ + puppeteer-core + FFmpeg | Optional, heavy |

Run dependency check:
```bash
python3 "$SKILL_ROOT/scripts/fireworks.py" doctor
```

## Related Skills

- **csp-frontend-slides** — when the diagram needs to be embedded in a presentation
- **csp-visual-verdict** — for screenshot-based QA of rendered diagrams against references
- **csp-graph-architecture** — for code-level dependency graphs (complementary: code structure vs system design)
- **doc-lifecycle** (external) — diagram asset lifecycle management, staleness detection
- **doc-insight** (external) — deep document analysis to extract diagrammable structure
