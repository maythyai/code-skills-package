# CSP Analysis Phase

## Purpose
The Analysis Phase is the optional first phase in the CSP four-phase development workflow. It focuses on exploring opportunities, validating ideas, and understanding the problem space before committing to detailed planning.

## When to Use This Phase
- **Use when**: Problem is unclear, opportunity needs validation, or multiple options exist
- **Skip when**: Requirements are well-defined, solution is obvious, or time is critical

## Phase Goals
1. **Problem Understanding**: Clearly define the problem or opportunity
2. **Opportunity Validation**: Assess business value and feasibility
3. **Option Exploration**: Generate and evaluate multiple approaches
4. **Stakeholder Alignment**: Ensure agreement on direction

## Key Activities

### 1. Business Opportunity Analysis
**Led by**: Business Analyst

**Activities**:
- Analyze market opportunity and competitive landscape
- Validate business case and ROI
- Identify stakeholders and their interests
- Assess strategic alignment

**Outputs**:
- Business opportunity assessment
- Stakeholder analysis
- Strategic alignment report
- Preliminary cost-benefit analysis

**Tools**:
```
csp-brainstorming --framework scamper
csp-party-mode --agents mary,john
```

### 2. User Research & Problem Discovery
**Led by**: Product Manager and UX Designer

**Activities**:
- Conduct user interviews and surveys
- Map user journeys and pain points
- Identify jobs to be done
- Define user personas

**Outputs**:
- User research findings
- User journey maps
- Problem statements
- User personas

**Tools**:
```
csp-brainstorming --framework hmw
csp-party-mode --agents john,sally
```

### 3. Technical Feasibility Assessment
**Led by**: System Architect

**Activities**:
- Assess technical constraints and requirements
- Evaluate technology options
- Identify technical risks
- Estimate complexity

**Outputs**:
- Technical feasibility report
- Technology constraints
- Risk assessment
- Complexity estimate

**Tools**:
```
csp-party-mode --agents winston,amelia
```

### 4. Option Generation & Evaluation
**Led by**: All relevant agents

**Activities**:
- Brainstorm multiple solution approaches
- Evaluate options using multi-criteria analysis
- Identify trade-offs
- Select preferred approach

**Outputs**:
- Option comparison matrix
- Trade-off analysis
- Recommended approach
- Decision rationale

**Tools**:
```
csp-brainstorming --framework six-hats
csp-party-mode --mode debate
```

## Phase Outputs

### Primary Artifacts
1. **Problem Statement**: Clear definition of the problem or opportunity
2. **Opportunity Assessment**: Business value, feasibility, and strategic alignment
3. **User Research Findings**: User needs, pain points, and jobs to be done
4. **Technical Feasibility**: Constraints, risks, and complexity
5. **Recommended Approach**: Selected solution with rationale

### Supporting Artifacts
- Stakeholder analysis
- User personas and journey maps
- Option comparison matrix
- Preliminary cost-benefit analysis
- Risk assessment

## Quality Gates

Before transitioning to Planning Phase:
- [ ] Problem statement is clear and specific
- [ ] Business value is validated (ROI > threshold)
- [ ] User needs are understood and documented
- [ ] Technical feasibility is confirmed
- [ ] Recommended approach is agreed upon by stakeholders
- [ ] Key risks are identified and acceptable

## Transition to Planning Phase

### Entry Criteria
- All primary artifacts are complete
- Quality gates are passed
- Stakeholders agree to proceed

### Handoff Meeting
- Present analysis findings to stakeholders
- Review recommended approach
- Confirm scope and boundaries
- Identify planning phase participants
- Set planning phase timeline

## Integration with CSP Tools

### With csp-brainstorming
- Used for option generation and evaluation
- Applies structured frameworks (SCAMPER, Six Hats, HMW)

### With csp-party-mode
- Multi-agent collaboration for problem analysis
- Debate mode for evaluating options
- Ensures all perspectives are considered

### With csp-spec
- Converts validated opportunity to preliminary SPEC
- Documents requirements and constraints

### With Specialized Agents
- Business Analyst leads business analysis
- Product Manager and UX Designer lead user research
- System Architect leads technical assessment
- All agents contribute to option evaluation

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "analyze", "explore", "validate idea", "assess opportunity"
- Recognized as the first phase in CSP workflow
- Can transition to Planning Phase when complete

### With Other CSP Layers
- **SP Brainstorming**: Complements structured brainstorming
- **CSP Discuss**: Integrates with CSP discussion workflows
- **CSP Patterns**: Can reference technology patterns during feasibility assessment

## Best Practices

1. **Time Box**: Limit analysis phase to 10-20% of total project time
2. **Focus on Validation**: Don't over-analyze; validate key assumptions
3. **Multiple Perspectives**: Involve relevant agents and stakeholders
4. **Document Decisions**: Capture rationale for chosen approach
5. **Know When to Stop**: Analysis paralysis is real; move to planning when you have enough information

## Anti-Patterns to Avoid
- Endless analysis without commitment
- Analyzing every possible option
- Ignoring user research
- Making decisions without data
- Skipping validation of key assumptions

## Example Workflow

```
User: "We're thinking about adding AI-powered recommendations to our e-commerce site"

Step 1: Business Analysis Business Analyst
- Market opportunity: $2M potential revenue
- Competitive analysis: 3/5 competitors have this feature
- ROI: 280% over 3 years
- Strategic alignment: High (supports personalization strategy)

Step 2: User Research (Product Manager & UX Designer)
- User interviews: 80% of users want personalized recommendations
- Pain point: Users spend 10+ minutes finding relevant products
- Job to be done: "Help me discover products I'll love"

Step 3: Technical Feasibility System Architect
- Technology options: Build vs buy (Recommend: Buy - AWS Personalize)
- Integration complexity: Medium (2-3 weeks)
- Data requirements: Need 6 months of purchase history (available)
- Risk: Low (proven technology, minimal custom development)

Step 4: Option Evaluation (All Agents)
- Option A: Build custom ML model (High effort, high flexibility)
- Option B: Use AWS Personalize (Low effort, medium flexibility)
- Option C: Use simple rules-based system (Low effort, low flexibility)
- Recommendation: Option B (best balance of effort and value)

Output: Analysis complete, ready for Planning Phase
```

## Success Metrics
- Problem is clearly defined and understood
- Business value is validated with data
- User needs are documented
- Technical feasibility is confirmed
- Stakeholders agree on recommended approach
- Phase completed within time box (1-2 weeks typical)
