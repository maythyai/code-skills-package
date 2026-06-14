# CSP Quick Development Flow

## Purpose
The `csp-quick-dev` skill provides a unified, streamlined development workflow that combines intent clarification, planning, implementation, review, and demonstration into a single cohesive process. This tool is ideal for rapid prototyping, small features, and time-sensitive development tasks.

## Functionality

### Core Behavior
1. **Intent Clarification**: Quickly understand what needs to be built
2. **Rapid Planning**: Create minimal viable plan
3. **Focused Implementation**: Build the core functionality
4. **Quick Review**: Validate implementation meets intent
5. **Demo Preparation**: Prepare for demonstration or deployment

### When to Use Quick Dev
- **Use when**:
  - Building prototypes or MVPs
  - Implementing small features (< 1 week)
  - Time-sensitive development
  - Exploring new technologies
  - Learning exercises
  - Hackathon projects

- **Skip when**:
  - Large, complex features (> 2 weeks)
  - Mission-critical systems
  - Regulatory or compliance requirements
  - Multiple stakeholder approval needed

### Quick Dev Workflow

#### Phase 1: Intent Clarification (5-10 minutes)
**Goal**: Understand what to build and why

**Activities**:
- Define the core problem or opportunity
- Identify target users and their needs
- Clarify success criteria
- Identify constraints and limitations

**Questions to Answer**:
1. What are we building?
2. Who is it for?
3. Why does it matter?
4. How will we know it's successful?
5. What are the must-have features?

**Output**: One-page intent document

```markdown
# Quick Dev Intent: [Feature Name]

**Problem/Opportunity**: [One sentence]
**Target Users**: [Who]
**Success Criteria**: [How to measure]
**Must-Have Features**:
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

**Constraints**:
- Time: [Timeline]
- Technology: [Stack]
- Resources: [Available resources]

**Out of Scope**:
- [Excluded feature 1]
- [Excluded feature 2]
```

#### Phase 2: Rapid Planning (10-20 minutes)
**Goal**: Create minimal viable plan

**Activities**:
- Break down into 3-5 implementation tasks
- Identify key technical decisions
- Define simple acceptance criteria
- Estimate effort (hours, not days)

**Output**: Task list with estimates

```markdown
# Quick Dev Plan: [Feature Name]

## Implementation Tasks
1. **[Task 1]** ([X] hours)
   - [Subtask 1.1]
   - [Subtask 1.2]
   - Acceptance: [Simple criteria]

2. **[Task 2]** ([X] hours)
   - [Subtask 2.1]
   - [Subtask 2.2]
   - Acceptance: [Simple criteria]

3. **[Task 3]** ([X] hours)
   - [Subtask 3.1]
   - Acceptance: [Simple criteria]

## Technical Decisions
- [Decision 1]: [Choice and rationale]
- [Decision 2]: [Choice and rationale]

## Total Estimate**: [X] hours
```

#### Phase 3: Focused Implementation (1-4 hours per task)
**Goal**: Build core functionality

**Approach**:
- Start with simplest working version
- Add features incrementally
- Test as you go
- Document decisions in code comments
- Commit frequently

**Best Practices**:
- Write tests for critical paths
- Handle happy path first, edge cases later
- Use existing patterns and libraries
- Don't over-engineer
- Keep it simple

#### Phase 4: Quick Review (15-30 minutes)
**Goal**: Validate implementation meets intent

**Review Checklist**:
- [ ] Core functionality works
- [ ] Acceptance criteria met
- [ ] No critical bugs
- [ ] Code is readable
- [ ] Basic error handling
- [ ] Simple tests pass

**Optional Reviews**:
- Code review (if time permits)
- Security review (if handling sensitive data)
- Performance review (if performance-critical)

#### Phase 5: Demo Preparation (15-30 minutes)
**Goal**: Prepare for demonstration or deployment

**Activities**:
- Create simple demo script
- Prepare example data
- Write brief documentation
- Set up demo environment
- Practice demonstration

**Output**: Demo-ready feature

```markdown
# Demo: [Feature Name]

## Demo Script
1. [Step 1]: [What to show]
2. [Step 2]: [What to show]
3. [Step 3]: [What to show]

## Example Data
- [Example 1]
- [Example 2]

## Key Points to Highlight
- [Point 1]
- [Point 2]

## Known Limitations
- [Limitation 1]
- [Limitation 2]

## Next Steps
- [Next step 1]
- [Next step 2]
```

### Input Processing
- Feature requests
- Problem statements
- User stories
- Prototyping requests
- Hackathon ideas

### Output Format
Produces complete quick dev package:

```markdown
# Quick Dev Package: [Feature Name]

## 1. Intent Document
[One-page intent document]

## 2. Implementation Plan
[Task list with estimates]

## 3. Implementation Summary
- **Time Spent**: [Actual hours]
- **Tasks Completed**: [Count]
- **Key Decisions**: [List of decisions made]
- **Technical Debt**: [Known issues to address later]

## 4. Review Results
- **Core Functionality**: [Pass/Fail]
- **Acceptance Criteria**: [Pass/Fail]
- **Code Quality**: [Good/Acceptable/Needs Work]
- **Test Coverage**: [Percentage or "Basic"]

## 5. Demo Materials
- [Demo script]
- [Example data]
- [Documentation]

## 6. Lessons Learned
- [What went well]
- [What could be improved]
- [Key insights]

## 7. Next Steps
- [ ] [Immediate next step]
- [ ] [Follow-up task]
- [ ] [Future enhancement]
```

## Implementation Details

### Quick Dev Process
1. **Clarify Intent** (5-10 min): Understand what and why
2. **Plan Rapidly** (10-20 min): Break down into tasks
3. **Implement Focus** (1-4 hours/task): Build core features
4. **Review Quickly** (15-30 min): Validate it works
5. **Prepare Demo** (15-30 min): Get ready to show

### Time Management
- **Total Time Box**: 1-2 days for entire flow
- **Per Task**: 1-4 hours maximum
- **Decision Time**: 5 minutes per decision (decide and move on)
- **Review Time**: 15-30 minutes (don't over-review)

### Quality Standards
Quick dev doesn't mean low quality. Maintain:
- Working core functionality
- Readable code
- Basic error handling
- Simple tests for critical paths
- Clear documentation

### When to Escalate to Full Workflow
Escalate if:
- Feature takes longer than estimated (> 2x)
- Multiple critical bugs found
- Requirements are unclear or changing
- Technical complexity is higher than expected
- Stakeholder concerns arise

## Usage Examples

### Prototype Development
```
User: "I need a quick prototype for a user feedback widget"

csp-quick-dev "user feedback widget prototype"
```

Output:
- Intent: Collect user feedback on product features
- Plan: 3 tasks (UI component, backend API, data storage)
- Implementation: 4 hours
- Review: Basic functionality works
- Demo: Show feedback submission and viewing

### Small Feature Implementation
```
User: "Add dark mode toggle to our app"

csp-quick-dev "dark mode toggle feature"
```

Output:
- Intent: Allow users to switch between light and dark themes
- Plan: 2 tasks (toggle UI, theme switching logic)
- Implementation: 2 hours
- Review: Toggle works, themes switch correctly
- Demo: Show before/after and persistence

### Hackathon Project
```
User: "Build a Slack bot for standup reminders"

csp-quick-dev "Slack standup bot"
```

Output:
- Intent: Automate daily standup reminders in Slack
- Plan: 4 tasks (Slack integration, scheduling, message formatting, configuration)
- Implementation: 6 hours
- Review: Bot sends reminders, accepts responses
- Demo: Show bot in action with sample team

### Learning Exercise
```
User: "Learn GraphQL by building a simple API"

csp-quick-dev "GraphQL learning project - simple blog API"
```

Output:
- Intent: Learn GraphQL basics through hands-on project
- Plan: 3 tasks (schema design, resolvers, queries/mutations)
- Implementation: 3 hours
- Review: Basic CRUD operations work
- Demo: Show queries and mutations in GraphQL playground

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "quick", "prototype", "MVP", "rapid", "hackathon", "simple feature"
- Recognized as a fast-track development tool
- Alternative to full four-phase workflow

### With Other CSP Tools
- **csp-brainstorming**: Can brainstorm before quick dev
- **csp-spec**: Can create SPEC after quick dev validates concept
- **csp-party-mode**: Can review quick dev output
- **Phase Workflows**: Quick dev can feed into full workflow for production

### With Specialized Agents
- Developer leads implementation
- Product Manager helps with intent clarification
- System Architect advises on technical decisions
- UX Designer reviews UX (if applicable)
- Technical Writer helps with documentation

### With External CSP Components
- **CSP Fast**: Similar to CSP fast-track workflow
- **CSP Patterns**: Uses technology patterns during implementation
- **CSP Testing**: Uses testing best practices

## Best Practices

1. **Time Box Everything**: Don't spend too long on any phase
2. **Focus on Core**: Build must-haves first, nice-to-haves later
3. **Keep It Simple**: Don't over-engineer
4. **Test Critical Paths**: At least test the happy path
5. **Document Decisions**: Note why you made key choices
6. **Demo Early**: Show progress to get feedback
7. **Learn and Iterate**: Capture lessons for next time
8. **Know When to Stop**: If it's taking too long, reassess

## Anti-Patterns to Avoid
- Skipping intent clarification (building wrong thing)
- Over-planning (analysis paralysis)
- Perfectionism (never finishing)
- Ignoring quality (creating technical debt)
- Not testing (shipping bugs)
- Poor documentation (no one can use it)
- Not demoing (no feedback loop)

## Advanced Features

### Quick Dev Templates
Pre-built templates for common scenarios:
```
csp-quick-dev --template prototype
csp-quick-dev --template api
csp-quick-dev --template ui-component
```

### Quick Dev Metrics
Track quick dev effectiveness:
```
csp-quick-dev --metrics
```

Output:
- Average time to delivery
- Success rate (demo accepted)
- Common blockers
- Quality metrics

### Quick Dev Retrospective
Post-delivery reflection:
```
csp-quick-dev --retro [feature-name]
```

Output:
- What went well
- What didn't
- Improvements for next time

### Quick Dev to Full Workflow
Convert quick dev to full workflow:
```
csp-quick-dev --escalate [feature-name]
```

Output:
- Transition plan
- Additional requirements
- Updated timeline
