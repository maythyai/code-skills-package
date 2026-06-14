# CSP Planning Phase

## Purpose
The Planning Phase defines what will be built, why it matters, and how success will be measured. It produces detailed requirements, specifications, and acceptance criteria that guide the solutioning and implementation phases.

## When to Use This Phase
- **Always use**: This phase is mandatory for all non-trivial features
- **Skip only**: For bug fixes, minor enhancements, or emergency hotfixes

## Phase Goals
1. **Requirements Definition**: Clearly specify what will be built
2. **User Value Articulation**: Define user stories and acceptance criteria
3. **Scope Management**: Establish boundaries and priorities
4. **Success Metrics**: Define how to measure success

## Key Activities

### 1. Product Requirements Definition
**Led by**: Product Manager

**Activities**:
- Write product requirements document (PRD)
- Define user stories with acceptance criteria
- Prioritize features using RICE framework
- Identify dependencies and constraints

**Outputs**:
- Product Requirements Document (PRD)
- User stories with acceptance criteria
- Feature priority list
- Dependency map

**Tools**:
```
csp-spec [requirements]
csp-party-mode --agents john,mary
```

### 2. User Experience Design
**Led by**: UX Designer

**Activities**:
- Create user flows and wireframes
- Design information architecture
- Define interaction patterns
- Conduct usability heuristics review

**Outputs**:
- User flow diagrams
- Wireframes (low and high fidelity)
- Interaction specifications
- UX requirements document

**Tools**:
```
csp-party-mode --agents sally,john
```

### 3. Technical Requirements
**Led by**: System Architect and Developer

**Activities**:
- Define technical requirements and constraints
- Specify non-functional requirements (performance, security, scalability)
- Identify integration points
- Estimate technical complexity

**Outputs**:
- Technical requirements document
- Non-functional requirements specification
- Integration requirements
- Complexity assessment

**Tools**:
```
csp-party-mode --agents winston,amelia
```

### 4. SPEC Generation
**Led by**: Product Manager and Technical Writer

**Activities**:
- Convert requirements to formal SPECs
- Validate SPECs for completeness and clarity
- Review SPECs with stakeholders
- Obtain SPEC approval

**Outputs**:
- SPEC contracts (one per feature/epic)
- SPEC validation report
- Stakeholder approval

**Tools**:
```
csp-spec [validated requirements]
csp-party-mode --mode review [spec documents]
```

## Phase Outputs

### Primary Artifacts
1. **Product Requirements Document (PRD)**: Complete product specification
2. **User Stories**: Detailed stories with acceptance criteria
3. **SPEC Contracts**: Formal specifications for each feature
4. **UX Design**: User flows, wireframes, interaction specs
5. **Technical Requirements**: Technical and non-functional requirements

### Supporting Artifacts
- Feature priority list (RICE scores)
- Dependency map
- Complexity assessment
- Stakeholder sign-off

## Quality Gates

Before transitioning to Solutioning Phase:
- [ ] PRD is complete and approved
- [ ] All user stories have clear acceptance criteria
- [ ] SPECs are validated for completeness and clarity
- [ ] UX designs are reviewed and approved
- [ ] Technical requirements are defined and feasible
- [ ] Stakeholders have signed off on requirements
- [ ] Success metrics are defined

## Transition to Solutioning Phase

### Entry Criteria
- All primary artifacts are complete and approved
- Quality gates are passed
- Requirements are stable (no major changes expected)

### Handoff Meeting
- Present PRD and SPECs to technical team
- Review UX designs and interactions
- Discuss technical requirements and constraints
- Identify solutioning phase participants
- Set solutioning phase timeline

## Integration with CSP Tools

### With csp-spec
- Converts requirements to formal SPEC contracts
- Validates SPEC completeness and clarity
- Tracks SPEC versions and changes

### With csp-party-mode
- Multi-agent review of PRD and SPECs
- Ensures all perspectives are considered
- Identifies gaps and conflicts

### With Specialized Agents
- Product Manager leads PRD and user story creation
- UX Designer leads UX design
- System Architect and Developer define technical requirements
- Technical Writer helps with SPEC documentation
- Business Analyst validates business alignment

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "plan", "requirements", "PRD", "user stories"
- Recognized as the second phase in CSP workflow
- Can transition to Solutioning Phase when complete

### With Other CSP Layers
- **CSP Plan Phase**: Integrates with CSP planning workflows
- **CSP Spec**: Uses `csp-spec-contract` + `change-artifacts/` templates under `.planning/`
- **CSP Patterns**: Can reference technology patterns for technical requirements

## Best Practices

1. **User-Centered**: Start with user needs and jobs to be done
2. **Testable Requirements**: Write acceptance criteria that can be tested
3. **Prioritize Ruthlessly**: Use RICE to focus on highest-value features
4. **Validate Early**: Review requirements with stakeholders before proceeding
5. **Iterate**: Refine requirements based on feedback
6. **Document Decisions**: Capture rationale for requirements and priorities

## Anti-Patterns to Avoid
- Writing requirements without user validation
- Vague or untestable acceptance criteria
- Scope creep (adding features without justification)
- Ignoring non-functional requirements
- Skipping stakeholder review

## Example Workflow

```
Context: Building a user authentication system

Step 1: Product Requirements Product Manager
PRD:
- Problem: Users need secure access to their accounts
- Solution: Email/password + OAuth authentication
- Success Metrics: 
  * 95% login success rate
  * <2 second login time
  * <0.1% security incidents

User Stories:
- As a user, I want to login with email/password so I can access my account
  * Acceptance: Login succeeds with valid credentials, fails with invalid
- As a user, I want to login with Google so I don't need another password
  * Acceptance: OAuth flow completes successfully, user is authenticated
- As a user, I want to reset my password so I can recover my account
  * Acceptance: Reset email sent, password updated successfully

Priority (RICE):
1. Email/password login (Score: 900) - P0
2. Password reset (Score: 750) - P0
3. OAuth login (Score: 600) - P1

Step 2: UX Design UX Designer
User Flow:
1. User clicks "Login"
2. Enter email and password
3. Click "Login" button
4. System validates credentials
5. Redirect to dashboard (success) or show error (failure)

Wireframes:
- Login form with email and password fields
- Inline validation for errors
- "Remember me" checkbox
- "Forgot password?" link
- OAuth buttons (Google, GitHub)

Step 3: Technical Requirements (System Architect & Developer)
Functional:
- Authenticate users with email/password
- Support OAuth 2.0 (Google, GitHub)
- Generate JWT tokens (1 hour expiry)
- Rate limit login attempts (5/minute)

Non-Functional:
- Performance: Login < 2 seconds (P95)
- Security: Passwords hashed with bcrypt (cost 12)
- Availability: 99.9% uptime
- Scalability: Support 10,000 logins/minute

Step 4: SPEC Generation
SPEC-001: Email/Password Authentication
- Requirements: FR-001, FR-002, NFR-001, NFR-002
- Acceptance Criteria: All login scenarios tested
- Dependencies: User database, email service
- Out of Scope: OAuth, 2FA

Output: Planning complete, ready for Solutioning Phase
```

## Success Metrics
- PRD is complete and approved
- User stories have clear, testable acceptance criteria
- SPECs are validated and approved
- UX designs are reviewed
- Technical requirements are feasible
- Phase completed within time box (1-2 weeks typical)
