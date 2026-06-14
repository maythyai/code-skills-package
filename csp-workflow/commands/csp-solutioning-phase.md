# CSP Solutioning Phase

## Purpose
The Solutioning Phase designs how to build what was defined in the Planning Phase. It produces architecture designs, implementation plans, and work breakdowns that guide the implementation phase.

## When to Use This Phase
- **Always use**: After Planning Phase for all non-trivial features
- **Skip only**: For trivial changes or emergency hotfixes

## Phase Goals
1. **Architecture Design**: Define system structure and components
2. **Implementation Planning**: Break down work into implementable units
3. **Risk Mitigation**: Identify and address technical risks
4. **Estimation**: Provide accurate effort and timeline estimates

## Key Activities

### 1. Architecture Design
**Led by**: System Architect

**Activities**:
- Design system architecture using C4 model
- Make architectural decisions and document rationale
- Define component boundaries and interfaces
- Evaluate technology choices

**Outputs**:
- Architecture diagrams (Context, Container, Component)
- Architecture Decision Records (ADRs)
- Technology selection rationale
- Component interface definitions

**Tools**:
```
csp-party-mode --agents winston,amelia
```

### 2. Implementation Planning
**Led by**: Developer

**Activities**:
- Break down features into implementation tasks
- Define task dependencies and sequencing
- Identify reusable components and patterns
- Estimate effort for each task

**Outputs**:
- Implementation task list
- Task dependency graph
- Effort estimates
- Reusable component identification

**Tools**:
```
csp-party-mode --agents amelia,winston
```

### 3. Epic and Story Creation
**Led by**: Product Manager and Developer

**Activities**:
- Convert SPECs to epics and user stories
- Define technical stories for infrastructure
- Create story acceptance criteria
- Prioritize stories for implementation

**Outputs**:
- Epics (large work items)
- User stories (implementable units)
- Technical stories (infrastructure, refactoring)
- Story map (visual representation)

**Tools**:
```
csp-spec --convert-to-stories [spec documents]
```

### 4. Implementation Readiness Check
**Led by**: All relevant agents

**Activities**:
- Review architecture and implementation plan
- Validate that all requirements are covered
- Identify risks and mitigation strategies
- Confirm team readiness

**Outputs**:
- Implementation readiness checklist
- Risk mitigation plan
- Team assignment and capacity plan
- Go/no-go decision

**Tools**:
```
csp-party-mode --mode review [architecture and plan]
```

## Phase Outputs

### Primary Artifacts
1. **Architecture Design**: System structure, components, and interfaces
2. **Architecture Decision Records (ADRs)**: Key decisions with rationale
3. **Implementation Plan**: Task breakdown with dependencies and estimates
4. **Epics and Stories**: Implementable work items
5. **Implementation Readiness Checklist**: Confirmation of readiness

### Supporting Artifacts
- Technology selection rationale
- Component interface definitions
- Task dependency graph
- Risk mitigation plan
- Team capacity plan

## Quality Gates

Before transitioning to Implementation Phase:
- [ ] Architecture design is complete and reviewed
- [ ] Key architectural decisions are documented (ADRs)
- [ ] Implementation plan covers all requirements
- [ ] Stories are well-defined with acceptance criteria
- [ ] Effort estimates are realistic and agreed upon
- [ ] Risks are identified and mitigation strategies defined
- [ ] Team is ready and has capacity
- [ ] Implementation readiness checklist is passed

## Transition to Implementation Phase

### Entry Criteria
- All primary artifacts are complete and approved
- Quality gates are passed
- Team has capacity and is ready to start

### Handoff Meeting
- Present architecture design to implementation team
- Review implementation plan and stories
- Discuss technical approach and patterns
- Assign stories to team members
- Set implementation phase timeline and milestones

## Integration with CSP Tools

### With csp-spec
- Converts SPECs to epics and stories
- Validates that implementation covers SPEC requirements
- Tracks traceability from SPEC to implementation

### With csp-party-mode
- Multi-agent review of architecture and plan
- Ensures all perspectives are considered
- Identifies risks and gaps

### With Specialized Agents
- System Architect leads architecture design
- Developer leads implementation planning
- Product Manager helps with story creation
- Business Analyst validates business alignment
- UX Designer reviews UX implementation approach
- Technical Writer documents architecture and plans

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "design", "architecture", "plan implementation", "create stories"
- Recognized as the third phase in CSP workflow
- Can transition to Implementation Phase when complete

### With Other CSP Layers
- **CSP Plan**: Integrates with CSP planning workflows
- **CSP Patterns**: References technology patterns for implementation
- **CSP Architecture**: Aligns with architecture best practices

## Best Practices

1. **Design for Change**: Use evolutionary architecture principles
2. **Document Decisions**: Create ADRs for all significant decisions
3. **Small Stories**: Break work into small, implementable stories (< 1 week)
4. **Validate Early**: Review architecture before implementation
5. **Consider Operations**: Design for deployment, monitoring, and maintenance
6. **Identify Risks**: Proactively identify and mitigate risks

## Anti-Patterns to Avoid
- Over-engineering (designing for hypothetical future requirements)
- Skipping architecture design (jumping straight to code)
- Large stories (too big to implement in one sprint)
- Ignoring non-functional requirements
- Not documenting decisions

## Example Workflow

```
Context: Implementing user authentication system (from Planning Phase)

Step 1: Architecture Design System Architect
Context Diagram:
- User ↔ Authentication Service ↔ User Database
- Authentication Service ↔ Email Service (for password reset)

Container Diagram:
- Web App (React)
- API Server (Node.js/Express)
- Authentication Service (microservice)
- User Database (PostgreSQL)
- Redis (session cache)
- Email Service (SendGrid)

Component Diagram (Authentication Service):
- LoginController: Handles login requests
- TokenService: Generates and validates JWT tokens
- PasswordHasher: Hashes passwords with bcrypt
- UserRepository: Accesses user database

ADRs:
- ADR-001: Use JWT for authentication (vs sessions)
  * Rationale: Stateless, scalable, mobile-friendly
- ADR-002: Use bcrypt for password hashing (cost 12)
  * Rationale: Industry standard, resistant to brute force
- ADR-003: Store sessions in Redis (vs database)
  * Rationale: Fast, supports expiration, reduces DB load

Step 2: Implementation Planning Developer
Tasks:
1. Setup project structure and dependencies (2 days)
2. Implement User model and database schema (2 days)
3. Implement password hashing utility (1 day)
4. Implement JWT token service (2 days)
5. Implement login endpoint (2 days)
6. Implement password reset flow (3 days)
7. Implement OAuth integration (3 days)
8. Add rate limiting middleware (1 day)
9. Write unit and integration tests (3 days)
10. Add logging and monitoring (1 day)

Total: 20 days (4 weeks for 1 developer)

Step 3: Epic and Story Creation
Epic: User Authentication System

Stories:
1. Setup authentication service project
   - Tasks: Initialize project, setup database connection, configure logging
   - Estimate: 2 days
   
2. Implement user registration
   - Tasks: Create User model, implement registration endpoint, validate input
   - Estimate: 3 days
   - Acceptance: User can register, password is hashed, validation works
   
3. Implement email/password login
   - Tasks: Implement login endpoint, validate credentials, return JWT
   - Estimate: 2 days
   - Acceptance: Login succeeds with valid credentials, fails with invalid
   
4. Implement password reset
   - Tasks: Send reset email, validate token, update password
   - Estimate: 3 days
   - Acceptance: User receives email, can reset password successfully
   
5. Implement OAuth login (Google)
   - Tasks: Integrate Google OAuth, handle callback, create/update user
   - Estimate: 3 days
   - Acceptance: User can login with Google account
   
6. Add security features
   - Tasks: Rate limiting, account lockout, audit logging
   - Estimate: 3 days
   - Acceptance: Rate limiting works, failed attempts are logged
   
7. Write tests and documentation
   - Tasks: Unit tests, integration tests, API documentation
   - Estimate: 4 days
   - Acceptance: >80% test coverage, documentation complete

Step 4: Implementation Readiness Check
- [x] Architecture design reviewed and approved
- [x] ADRs documented for key decisions
- [x] Stories cover all SPEC requirements
- [x] Effort estimates reviewed (20 days)
- [x] Risks identified (OAuth integration complexity, email deliverability)
- [x] Team assigned (1 developer available for 4 weeks)
- [x] Development environment ready

Output: Solutioning complete, ready for Implementation Phase
```

## Success Metrics
- Architecture design is complete and reviewed
- ADRs are documented for key decisions
- Stories are well-defined and implementable
- Effort estimates are realistic
- Risks are identified and mitigated
- Phase completed within time box (1-2 weeks typical)
