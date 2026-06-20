---
name: csp-party-mode
description: Multi-agent collaboration for complex problem-solving with specialized AI agents
layer: 1
category: meta
---

# CSP Party Mode - Multi-Agent Collaboration

## Purpose
The `csp-party-mode` skill enables multi-agent collaborative discussions where specialized AI agents work together to solve complex problems. Agents contribute their unique perspectives, challenge assumptions, and build on each other's ideas to produce higher-quality outcomes.

## Functionality

### Core Behavior
1. **Agent Selection**: Automatically selects relevant agents based on the problem domain
2. **Discussion Facilitation**: Orchestrates structured multi-agent conversations
3. **Perspective Diversity**: Ensures each agent contributes their unique expertise
4. **Synthesis**: Combines insights from multiple agents into coherent recommendations
5. **Conflict Resolution**: Identifies and resolves disagreements between agents

### Discussion Modes

#### Mode 1: Round-Robin
Each agent contributes in sequence:
- Business Analyst → Business and strategic perspective
- Product Manager → User value and business requirements
- System Architect → Technical feasibility and constraints
- Developer → Implementation considerations
- UX Designer → User experience and design
- Technical Writer → Documentation and communication

#### Mode 2: Debate
Agents take opposing positions:
- Proponent argues for the proposal
- Opponent challenges assumptions and identifies risks
- Moderator synthesizes the discussion

#### Mode 3: Brainstorm
Free-form ideation with multiple agents:
- Agents contribute ideas without criticism
- Ideas are grouped and categorized
- Group evaluates and prioritizes

#### Mode 4: Review
Multi-agent review of a proposal or artifact:
- Each agent reviews from their perspective
- Agents identify issues specific to their domain
- Consolidated review report with prioritized findings

### Input Processing
- Problem statements or questions
- Proposals or design documents
- Code or architecture reviews
- Strategic decisions requiring multiple perspectives

### Output Format
Produces a structured discussion transcript:

```markdown
# Party Mode Discussion: [Topic]

## Participants
- Business Analyst
- Product Manager
- System Architect
- [Other relevant agents]

## Discussion Mode
[Round-Robin | Debate | Brainstorm | Review]

## Discussion Transcript

### Business Analyst
[Business and strategic perspective]

**Key Points:**
- [Point 1]
- [Point 2]

**Recommendations:**
- [Recommendation 1]

---

### Product Manager
[User value and requirements perspective]

**Key Points:**
- [Point 1]
- [Point 2]

**Recommendations:**
- [Recommendation 1]

---

[Continue for each agent]

## Synthesis

### Areas of Agreement
- [Points all agents agree on]

### Areas of Disagreement
- [Points where agents disagree, with reasoning]

### Consolidated Recommendations
1. [Priority 1 recommendation with supporting evidence]
2. [Priority 2 recommendation with supporting evidence]

### Action Items
- [ ] [Specific action with owner and deadline]
- [ ] [Specific action with owner and deadline]

### Open Questions
- [Questions requiring further investigation]
```

## Implementation Details

### Agent Selection Logic
Based on problem domain, automatically select relevant agents:

**Strategic/Business Problems:**
- Business Analyst - Primary
- Product Manager - Primary
- System Architect - Advisory

**Technical Architecture:**
- System Architect - Primary
- Developer - Primary
- Business Analyst - Advisory

**User Experience:**
- UX Designer - Primary
- Product Manager - Primary
- Technical Writer - Advisory

**Implementation:**
- Developer - Primary
- System Architect - Advisory
- UX Designer - Advisory (for UI features)

**Documentation:**
- Technical Writer - Primary
- Product Manager - Advisory
- Relevant technical expert

### Discussion Orchestration
1. **Context Sharing**: Provide all agents with the same context
2. **Sequential Contribution**: Agents contribute in defined order
3. **Cross-Reference**: Agents can reference previous contributions
4. **Challenge Phase**: Agents can challenge or build on others' points
5. **Synthesis**: Moderator combines insights into final recommendations

### Quality Gates
Before finalizing discussion:
- All relevant agents have contributed
- Key disagreements are identified and documented
- Recommendations are actionable and specific
- Open questions are clearly stated
- Action items have clear owners

## Usage Examples

### Strategic Decision
```
User: "Should we build our own authentication system or use a third-party provider?"

csp-party-mode [problem statement]
```

Output: Multi-agent discussion with Business Analyst analyzing business implications, Product Manager evaluating user impact, System Architect assessing technical trade-offs, and Developer considering implementation complexity.

### Architecture Review
```
User: "Review this microservices architecture proposal"

csp-party-mode --mode review ./architecture-proposal.md
```

Output: Each agent reviews from their perspective, identifying issues and providing recommendations.

### Feature Brainstorm
```
User: "Brainstorm features for our mobile app's onboarding flow"

csp-party-mode --mode brainstorm [problem statement]
```

Output: Free-form ideation with multiple agents contributing ideas, followed by categorization and prioritization.

### Code Review
```
User: "Review this critical piece of code"

csp-party-mode --mode review [code snippet]
```

Output: Developer reviews implementation quality, System Architect reviews architectural fit, UX Designer reviews UX implications (if UI code).

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "party mode", "multi-agent", "collaborative", "discussion", "multiple perspectives"
- Recognized as a collaboration and review tool
- Can chain to SPEC generation or phase workflows

### With Other CSP Tools
- **csp-spec**: Party mode can review generated SPECs
- **csp-brainstorming**: Party mode extends brainstorming with multi-agent perspectives
- **Phase Workflows**: Party mode used for key decisions in each phase
- **Review Tools**: Party mode orchestrates multi-agent reviews

### With Specialized Agents
- Directly invokes agent personas
- Maintains agent communication styles
- Tracks agent-specific contributions

### With External CSP Components
- **CSP Review Skills**: Party mode can orchestrate CSP reviewers
- **GSD Workflows**: Party mode outputs can feed into GSD decision logs
- **CSP**: Party mode can review CSP proposals

## Best Practices

1. **Clear Problem Statement**: Frame the problem clearly before starting discussion
2. **Appropriate Mode Selection**: Choose discussion mode based on goal
3. **Agent Relevance**: Only include agents with relevant expertise
4. **Time Boxing**: Limit discussion length to maintain focus
5. **Actionable Outcomes**: Ensure discussions produce concrete action items
6. **Follow-Up**: Track action items and open questions

## Error Handling
- Gracefully handles vague problem statements
- Identifies when additional context is needed
- Manages agent disagreements constructively
- Provides default recommendations when consensus isn't reached
- Warns when discussion is too broad or unfocused

## Advanced Features

### Custom Agent Sets
Define custom agent combinations for specific domains:
```yaml
custom_party:
  name: "Security Review Party"
  agents:
    - name: "Security Analyst"
      persona: "Adversarial security mindset"
    - name: "Compliance Officer"
      persona: "Regulatory and compliance focus"
    - name: "DevSecOps Engineer"
      persona: "Implementation security focus"
```

### Discussion Templates
Pre-built discussion structures for common scenarios:
- Architecture Decision Records (ADR)
- Trade-off Analysis
- Risk Assessment
- Feature Prioritization

### Persistent Discussions
Save discussion context for future reference:
```
csp-party-mode --save discussion-2026-06-12.md
csp-party-mode --resume discussion-2026-06-12.md
```

### Cross-Project Learning
Aggregate insights from multiple party mode discussions:
```
csp-party-mode --learn-from "./past-discussions/*.md"
```
