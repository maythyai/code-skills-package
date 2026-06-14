# CSP Implementation Phase

## Purpose
The Implementation Phase executes the plan created in the Solutioning Phase. It produces working, tested, and documented code that delivers the value defined in the Planning Phase.

## When to Use This Phase
- **Always use**: After Solutioning Phase for all features
- **This is where the actual building happens**

## Phase Goals
1. **Code Implementation**: Write clean, tested, maintainable code
2. **Quality Assurance**: Ensure code meets quality standards
3. **Documentation**: Create user and developer documentation
4. **Validation**: Verify implementation meets requirements

## Key Activities

### 1. Story Implementation
**Led by**: Developer

**Activities**:
- Implement stories following TDD approach
- Write unit and integration tests
- Refactor code for clarity and maintainability
- Handle edge cases and error scenarios

**Outputs**:
- Working code
- Unit and integration tests
- Code documentation
- Pull requests

**Process**:
1. Pick story from backlog
2. Review acceptance criteria
3. Write tests first (TDD)
4. Implement functionality
5. Refactor and clean up
6. Run tests and fix failures
7. Submit pull request for review

**Tools**:
```
csp-guidance "What story should I implement next?"
```

### 2. Code Review
**Led by**: System Architect and Developer

**Activities**:
- Review code for correctness and quality
- Check adherence to architecture and patterns
- Identify bugs, security issues, and performance problems
- Suggest improvements and refactoring

**Outputs**:
- Code review feedback
- Approved or rejected pull requests
- Refactoring suggestions
- Bug fixes

**Tools**:
```
csp-party-mode --mode review [pull request]
```

### 3. Documentation
**Led by**: Technical Writer

**Activities**:
- Create user-facing documentation
- Write developer documentation
- Update API documentation
- Create tutorials and guides

**Outputs**:
- User documentation
- Developer documentation
- API reference
- Tutorials and how-to guides

**Tools**:
```
csp-party-mode --agents paige
```

### 4. Testing and Validation
**Led by**: Developer and Product Manager

**Activities**:
- Run automated tests (unit, integration, e2e)
- Perform manual testing
- Validate against acceptance criteria
- Conduct user acceptance testing (UAT)

**Outputs**:
- Test results
- Bug reports
- Validation report
- UAT sign-off

**Tools**:
```
csp-party-mode --agents john,sally [for UAT]
```

### 5. Deployment and Release
**Led by**: Developer and System Architect

**Activities**:
- Deploy to staging environment
- Conduct final validation
- Deploy to production
- Monitor for issues

**Outputs**:
- Staging deployment
- Production deployment
- Release notes
- Monitoring dashboards

## Phase Outputs

### Primary Artifacts
1. **Working Code**: Implements all stories and acceptance criteria
2. **Test Suite**: Comprehensive automated tests
3. **Documentation**: User and developer documentation
4. **Validation Report**: Confirmation that requirements are met
5. **Release**: Deployed to production

### Supporting Artifacts
- Pull requests with code review feedback
- Bug reports and fixes
- Test results and coverage reports
- Release notes
- Monitoring and alerting configuration

## Quality Gates

Before marking implementation as complete:
- [ ] All stories are implemented and accepted
- [ ] Code passes all automated tests
- [ ] Test coverage meets threshold (>80%)
- [ ] Code review is approved
- [ ] Documentation is complete
- [ ] Validation against SPECs is successful
- [ ] User acceptance testing is passed
- [ ] Deployment to production is successful
- [ ] Monitoring and alerting are configured
- [ ] No critical or high-severity bugs remain

## Integration with CSP Tools

### With csp-spec
- Validates implementation against SPEC requirements
- Ensures all acceptance criteria are met
- Tracks traceability from SPEC to code

### With csp-party-mode
- Multi-agent code review
- Multi-agent UAT
- Identifies issues from multiple perspectives

### With csp-help
- Recommends next story to implement
- Suggests best practices and patterns
- Provides guidance on implementation approach

### With Specialized Agents
- Developer implements code and writes tests
- System Architect reviews architecture compliance
- Product Manager validates user stories and acceptance criteria
- UX Designer reviews UX implementation
- Technical Writer creates documentation
- Business Analyst validates business value delivery

## Integration with CSP Ecosystem

### With CSP Router
- Triggered by keywords: "implement", "code", "build", "develop"
- Recognized as the fourth phase in CSP workflow
- Can trigger code review, testing, and deployment tools

### With Other CSP Layers
- **CSP Execute**: Integrates with CSP execution workflows
- **CSP Patterns**: References technology patterns during implementation
- **CSP Review**: Uses language-specific review skills
- **CSP Testing**: Uses language-specific testing skills

## Best Practices

1. **Test-Driven Development**: Write tests before implementation
2. **Small Commits**: Commit frequently with clear messages
3. **Code Review**: Review all code before merging
4. **Continuous Integration**: Run tests on every commit
5. **Documentation**: Document as you go, not at the end
6. **Refactor Continuously**: Improve code structure as you work
7. **Handle Edge Cases**: Consider error scenarios and edge cases
8. **Monitor**: Set up monitoring and alerting before release

## Anti-Patterns to Avoid
- Writing code without tests
- Large, unreviewed pull requests
- Ignoring code review feedback
- Skipping documentation
- Deploying without validation
- Ignoring monitoring and alerting

## Example Workflow

```
Context: Implementing user authentication system (from Solutioning Phase)

Sprint 1 (Week 1):
Story 1: Setup authentication service project
- Initialize Node.js project
- Setup PostgreSQL connection
- Configure logging System Architect
- Write setup tests
- Pull request: reviewed and merged

Story 2: Implement user registration
- Create User model with email, password_hash, created_at
- Implement POST /users endpoint
- Add input validation (email format, password strength)
- Hash password with bcrypt
- Write unit and integration tests
- Pull request: reviewed and merged

Sprint 2 (Week 2):
Story 3: Implement email/password login
- Implement POST /auth/login endpoint
- Validate credentials against database
- Generate JWT token (1 hour expiry)
- Return token and user info
- Write tests for success and failure cases
- Pull request: reviewed and merged

Story 4: Implement password reset
- Implement POST /auth/forgot-password endpoint
- Generate reset token (1 hour expiry)
- Send email with reset link (SendGrid)
- Implement POST /auth/reset-password endpoint
- Validate token and update password
- Write tests for all scenarios
- Pull request: reviewed and merged

Sprint 3 (Week 3):
Story 5: Implement OAuth login (Google)
- Integrate Google OAuth 2.0
- Implement GET /auth/google endpoint
- Handle OAuth callback
- Create or update user from Google profile
- Generate JWT token
- Write integration tests
- Pull request: reviewed and merged

Story 6: Add security features
- Implement rate limiting (5 login attempts/minute)
- Add account lockout (10 failed attempts)
- Implement audit logging (all auth events)
- Add CORS configuration
- Write security tests
- Pull request: reviewed and merged

Sprint 4 (Week 4):
Story 7: Write tests and documentation
- Achieve >80% test coverage
- Write API documentation (OpenAPI/Swagger)
- Create user guide
- Write developer documentation
- Create troubleshooting guide
- Pull request: reviewed and merged

Validation:
- Automated tests: 95% pass rate, 85% coverage
- Manual testing: All user stories validated
- UAT: Product Manager and UX Designer test all flows, approved
- Performance: Login < 200ms (P95), meets requirement
- Security: No vulnerabilities found in security scan

Deployment:
- Deploy to staging environment
- Conduct final validation
- Deploy to production
- Configure monitoring (login success rate, error rate, latency)
- Set up alerts (error rate > 1%, latency > 500ms)
- Monitor for 24 hours

Release Notes:
- New: User authentication system
- Features: Email/password login, OAuth (Google), password reset
- Performance: Login < 200ms
- Security: Industry-standard encryption and rate limiting

Output: Implementation complete, feature live in production
```

## Success Metrics
- All stories implemented and accepted
- Test coverage > 80%
- Code review approved
- Documentation complete
- Validation successful
- UAT passed
- Production deployment successful
- No critical bugs
- Phase completed within time box (2-4 weeks typical)
