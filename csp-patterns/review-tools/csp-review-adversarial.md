# CSP Adversarial Review

## Purpose
The `csp-review-adversarial` skill conducts thorough, skeptical reviews that challenge assumptions, identify weaknesses, and expose potential failures. This "devil's advocate" approach ensures proposals and implementations are robust and well-considered.

## Functionality

### Core Behavior
1. **Assumption Challenging**: Questions every assumption and claim
2. **Weakness Identification**: Finds flaws, gaps, and vulnerabilities
3. **Failure Mode Analysis**: Identifies how things could go wrong
4. **Stress Testing**: Evaluates under extreme conditions
5. **Constructive Criticism**: Provides actionable improvement suggestions

### Review Approach
The reviewer adopts an adversarial mindset:
- "What could go wrong?"
- "What assumptions are being made?"
- "What evidence is missing?"
- "What edge cases are ignored?"
- "What are the hidden costs?"
- "Who benefits and who loses?"

### Input Processing
- Proposals and design documents
- Architecture designs
- Code implementations
- Business cases and strategies
- User requirements and specifications

### Output Format
Produces a structured adversarial review:

```markdown
# Adversarial Review: [Subject]

## Executive Summary
[One-paragraph assessment of overall robustness]

## Critical Issues (Must Fix)

### Issue 1: [Title]
**Severity**: Critical
**Description**: [Detailed description of the issue]
**Impact**: [What could go wrong]
**Evidence**: [Why this is a problem]
**Recommendation**: [How to fix it]

### Issue 2: [Title]
...

## Major Concerns (Should Fix)

### Concern 1: [Title]
**Severity**: High
**Description**: [Detailed description]
**Risk**: [Potential negative outcome]
**Mitigation**: [How to address it]

### Concern 2: [Title]
...

## Minor Issues (Consider Fixing)

### Issue 1: [Title]
**Severity**: Medium
**Description**: [Description]
**Suggestion**: [Improvement suggestion]

## Assumption Challenges

### Assumption 1: [Statement being challenged]
**Challenge**: [Why this assumption may be wrong]
**Evidence Needed**: [What would validate or invalidate this]
**Alternative**: [Different perspective]

### Assumption 2: [Statement being challenged]
...

## Failure Mode Analysis

### Failure Mode 1: [Scenario]
**Trigger**: [What could cause this]
**Impact**: [Severity of impact]
**Likelihood**: [High/Medium/Low]
**Mitigation**: [How to prevent or handle]

### Failure Mode 2: [Scenario]
...

## Edge Cases Not Considered

### Edge Case 1: [Scenario]
**Why It Matters**: [Impact if this occurs]
**Recommendation**: [How to handle]

### Edge Case 2: [Scenario]
...

## Hidden Costs and Risks

### Cost/Risk 1: [Description]
**Impact**: [Quantified if possible]
**Mitigation**: [How to reduce]

### Cost/Risk 2: [Description]
...

## Stress Test Results

### Scenario 1: [Extreme condition]
**Current Behavior**: [How it performs now]
**Expected Behavior**: [How it should perform]
**Gap**: [What needs to change]

### Scenario 2: [Extreme condition]
...

## Positive Findings
[What's done well and should be preserved]

## Overall Assessment
**Robustness Score**: [1-10, where 10 is highly robust]
**Confidence Level**: [High/Medium/Low]
**Recommendation**: [Proceed / Proceed with caution / Rework needed]

## Priority Action Items
1. [Most critical action with owner and deadline]
2. [Next action with owner and deadline]
3. [Next action with owner and deadline]
```

## Implementation Details

### Review Process
1. **Initial Read**: Understand the proposal without judgment
2. **Assumption Mapping**: List all explicit and implicit assumptions
3. **Weakness Hunting**: Systematically look for flaws
4. **Failure Mode Analysis**: Identify how things could fail
5. **Edge Case Discovery**: Find overlooked scenarios
6. **Stress Testing**: Evaluate under extreme conditions
7. **Constructive Feedback**: Provide actionable improvements

### Adversarial Techniques

#### Technique 1: The 5 Whys
Ask "why" five times to get to root causes:
- Why will this work? → Because X
- Why will X happen? → Because Y
- Why will Y happen? → Because Z
- Why will Z happen? → Because A
- Why will A happen? → Because B (root cause)

#### Technique 2: Pre-Mortem
Imagine the project has failed spectacularly:
- "It's 6 months from now and this failed. What went wrong?"
- Work backwards to identify causes
- Prioritize by likelihood and impact

#### Technique 3: Red Team
Actively try to break the proposal:
- Attack from multiple angles (technical, business, user)
- Look for single points of failure
- Identify dependencies and risks

#### Technique 4: Devil's Advocate
Argue against the proposal:
- Take the opposing position
- Find counterexamples
- Challenge with "what if" scenarios

#### Technique 5: Worst-Case Analysis
Consider the worst possible outcomes:
- What's the worst that could happen?
- How likely is it?
- How would we recover?

### Quality Gates
Before finalizing review:
- All major assumptions are challenged
- Critical issues are clearly identified
- Failure modes are analyzed
- Edge cases are considered
- Recommendations are actionable
- Tone is constructive, not destructive

## Usage Examples

### Architecture Review
```
User: "Review this microservices architecture proposal"

csp-review-adversarial ./architecture-proposal.md
```

Output: Comprehensive review identifying:
- Critical: Single database creates bottleneck
- High: Service mesh adds operational complexity
- Assumption challenge: "Microservices always improve scalability"
- Failure modes: Network partition, cascading failures
- Edge cases: Partial failures, eventual consistency issues

### Business Case Review
```
User: "Review this business case for new product launch"

csp-review-adversarial [business case document]
```

Output: Review identifying:
- Critical: Market size overestimated by 40%
- High: Competitive response not considered
- Hidden costs: Customer support, maintenance
- Stress test: What if adoption is 50% of forecast?

### Code Review
```
User: "Review this authentication implementation"

csp-review-adversarial [code snippet]
```

Output: Review identifying:
- Critical: SQL injection vulnerability
- High: No rate limiting on login attempts
- Edge cases: Concurrent login attempts, token expiration during session
- Stress test: 10,000 simultaneous logins

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "adversarial review", "challenge", "devil's advocate", "stress test"
- Recognized as a quality assurance tool
- Can be used at any phase for validation

### With Other CSP Tools
- \*\*csp-spec**: Reviews SPECs for completeness and feasibility
- \*\*csp-party-mode**: Adversarial agent contributes skeptical perspective
- **Phase Workflows**: Used in quality gates between phases

### With Specialized Agents
- Business Analyst challenges business assumptions
- System Architect challenges technical decisions
- Developer challenges implementation quality
- All agents can adopt adversarial stance

### With External CSP Components
- **CSP Code Review**: Complements language-specific review skills
- **CSP Security Review**: Aligns with security review practices
- **CSP Review**: Integrates with CSP review workflows

## Best Practices

1. **Constructive Tone**: Challenge ideas, not people
2. **Evidence-Based**: Support criticisms with evidence
3. **Actionable Feedback**: Provide specific improvement suggestions
4. **Balanced View**: Acknowledge what's done well
5. **Prioritize**: Focus on critical issues first
6. **Be Specific**: Avoid vague criticisms
7. **Consider Context**: Understand constraints and trade-offs

## Anti-Patterns to Avoid
- Destructive criticism without solutions
- Nitpicking minor issues
- Ignoring context and constraints
- Personal attacks
- Being adversarial for its own sake
- Blocking progress unnecessarily

## Advanced Features

### Multi-Perspective Adversarial Review
Review from multiple adversarial angles:
```
csp-review-adversarial --perspectives technical,business,user,security
```

### Adversarial Review Checklist
Generate a customized checklist for specific domains:
```
csp-review-adversarial --checklist architecture
```

### Adversarial Review Workshop
Facilitate a group adversarial review session:
```
csp-review-adversarial --workshop --participants john,mary,winston
```
